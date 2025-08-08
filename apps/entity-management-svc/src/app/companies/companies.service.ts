/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpException } from '@ap2/amqp';
import {
  AddressDto,
  CompanyCreateDto,
  CompanyCreateResponse,
  CompanyDto,
  ErrorMessages,
  PaginatedData,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import {
  IUserManagementService,
  USER_MANAGEMENT_SERVICE_TOKEN,
} from '@greencomplai/user-management';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FlagsService } from '../flags/flags.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly flagsService: FlagsService,
    @Inject(USER_MANAGEMENT_SERVICE_TOKEN)
    private readonly userManagementService: IUserManagementService
  ) {}

  async createCompanyOfEmployee(
    dto: CompanyCreateDto,
    employeeId: string
  ): Promise<CompanyDto> {
    const evaluationElement = new CompanyCreateDto(
      '',
      '',
      '',
      [new AddressDto('', '', '', '')],
      []
    );

    const ownCompany = await this.getCompanyForEmployee(employeeId);
    dto.flags = this.flagsService.evaluateFlag(
      dto,
      evaluationElement,
      dto.flags
    );

    if (ownCompany) {
      throw new AmqpException(
        ErrorMessages.userAlreadyHasCompany,
        HttpStatus.BAD_REQUEST
      );
    }
    const company = await this.prismaService.company.create({
      data: {
        name: dto.name?.toString() ?? 'N/A',
        email: dto.email?.toString() ?? 'N/A',
        phone: dto.phone?.toString() ?? 'N/A',
        addresses: dto.addresses
          ? {
              createMany: { data: dto.addresses },
            }
          : undefined,
        employees: {
          create: {
            id: employeeId,
          },
        },
      },
      include: { addresses: true, employees: true },
    });

    return company;
  }

  async createAssociatedCompany(
    dto: CompanyCreateDto,
    employeeId: string
  ): Promise<CompanyCreateResponse> {
    const parentCompany = await this.getCompanyForEmployee(employeeId);

    if (!parentCompany)
      throw new AmqpException(
        ErrorMessages.userHasNoCompany,
        HttpStatus.NOT_FOUND
      );

    const userCreationResult = await this.userManagementService.createUser({
      username: dto.name.toLocaleLowerCase().replace(/\s+/g, '_'),
      email: dto.email,
      firstName: dto.name,
      lastName: '',
      initialPassword: dto.name.trim().toLocaleLowerCase(),
      groups: ['AP2/Lieferant'],
    });

    const company = await this.prismaService.company.create({
      data: {
        name: dto.name?.toString() ?? 'N/A',
        email: dto.email?.toString() ?? 'N/A',
        phone: dto.phone?.toString() ?? 'N/A',
        addresses: dto.addresses
          ? {
              createMany: { data: dto.addresses },
            }
          : undefined,
        parentCompanies: {
          create: {
            associatedCompanyId: parentCompany.id,
          },
        },
      },
      include: { addresses: true, parentCompanies: true },
    });

    await this.prismaService.user.create({
      data: {
        id: userCreationResult.id,
        company: {
          connect: {
            id: company.id,
          },
        },
      },
    });

    return {
      company: new CompanyDto(
        company.id,
        company.name,
        company.email,
        company.phone,
        company.addresses,
        []
      ),
      username: userCreationResult.username,
    };
  }

  async findAssociatedCompanies(
    employeeId: string,
    filters: string,
    sorting: string,
    page: number,
    size: number
  ): Promise<PaginatedData<CompanyDto>> {
    const parentCompany = await this.getCompanyForEmployee(employeeId);

    if (!parentCompany) {
      throw new AmqpException(
        ErrorMessages.userHasNoCompany,
        HttpStatus.NOT_FOUND
      );
    }

    const skip: number = (page - 1) * size;

    const whereCondition = {
      AND: [
        {
          parentCompanies: {
            some: {
              associatedCompanyId: parentCompany.id,
            },
          },
        },
        {
          OR:
            filters && filters !== ''
              ? [
                  { id: { contains: filters } },
                  { name: { contains: filters } },
                  { email: { contains: filters } },
                  { phone: { contains: filters } },
                ]
              : [],
        },
      ],
    };

    const associatedCompanies = await this.prismaService.company.findMany({
      skip: skip,
      take: size,
      where: whereCondition,
      include: { addresses: true },
      orderBy: JSON.parse(sorting || '{}'),
    });

    const totalCount = await this.prismaService.company.count({
      where: whereCondition,
    });

    return {
      data: associatedCompanies,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findCompanyById(id: string): Promise<CompanyDto> {
    const company = await this.prismaService.company.findUnique({
      where: {
        id: id,
      },
      include: { addresses: true },
    });
    return company;
  }

  async removeCompany(id: string): Promise<void> {
    await this.prismaService.associatedCompanies.deleteMany({
      where: {
        OR: [{ companyId: id }, { associatedCompanyId: id }],
      },
    });

    await this.prismaService.company.delete({
      where: { id: id },
    });
  }

  async updateCompany(id: string, dto: CompanyCreateDto): Promise<CompanyDto> {
    const company = await this.prismaService.company.update({
      where: {
        id,
      },
      data: {
        ...dto,
        addresses: {
          updateMany: dto.addresses.map((address) => ({
            where: { id: address.id },
            data: { ...address },
          })),
        },
      },
      include: { addresses: true },
    });

    return company;
  }

  async getCompanyForEmployee(
    employeeId: string
  ): Promise<CompanyDto | undefined> {
    const employee = await this.prismaService.user.findUnique({
      where: {
        id: employeeId,
      },
      include: { company: { include: { addresses: true } } },
    });

    return employee?.company;
  }
}
