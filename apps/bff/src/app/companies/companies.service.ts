/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, CompanyMessagePatterns } from '@ap2/amqp';
import {
  CompanyCreateResponse,
  CompanyDto,
  CompanyEntity,
  CreateCompanyProps,
  DeleteCompanyProps,
  FindAssociatedCompaniesProps,
  FindCompanyByIdProps,
  PaginatedData,
  UpdateCompanyProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { toCompanyDto } from './company.mapper';

@Injectable()
export class CompaniesService {
  private readonly logger: Logger = new Logger(CompaniesService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  async createCompany(props: CreateCompanyProps): Promise<CompanyDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<CompanyEntity>(
        CompanyMessagePatterns.CREATE,
        props
      )
    );
    return toCompanyDto(entity);
  }

  async createAssociatedCompany(
    props: CreateCompanyProps
  ): Promise<CompanyCreateResponse> {
    const result = await firstValueFrom(
      this.entityManagementService.send<{
        company: CompanyEntity;
        username: string;
      }>(CompanyMessagePatterns.CREATE_ASSOCIATE_COMPANY, props)
    );
    return new CompanyCreateResponse(
      toCompanyDto(result.company),
      result.username
    );
  }

  async findAllAssociatedCompanies(
    props: FindAssociatedCompaniesProps
  ): Promise<PaginatedData<CompanyDto>> {
    const result = await firstValueFrom(
      this.entityManagementService.send<PaginatedData<CompanyEntity>>(
        CompanyMessagePatterns.READ_COMPANIES,
        props
      )
    );
    return {
      data: result.data
        ?.map((entity) => toCompanyDto(entity))
        .filter((c): c is CompanyDto => c !== null),
      meta: result.meta,
    };
  }

  async findOne(props: FindCompanyByIdProps): Promise<CompanyDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<CompanyEntity | null>(
        CompanyMessagePatterns.READ_BY_ID,
        props
      )
    );
    return toCompanyDto(entity);
  }

  async update(props: UpdateCompanyProps): Promise<CompanyDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<CompanyEntity>(
        CompanyMessagePatterns.UPDATE,
        props
      )
    );
    return toCompanyDto(entity);
  }

  remove(props: DeleteCompanyProps): Promise<void> {
    return firstValueFrom(
      this.entityManagementService.send(CompanyMessagePatterns.DELETE, props)
    );
  }

  async findOneByUserId(
    props: FindCompanyByIdProps
  ): Promise<CompanyDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<CompanyEntity | null>(
        CompanyMessagePatterns.READ_BY_USER_ID,
        props
      )
    );
    return toCompanyDto(entity);
  }
}
