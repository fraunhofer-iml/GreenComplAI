/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpException, CompanyMessagePatterns } from '@ap2/amqp';
import {
  CompanyDto,
  CreateCompanyProps,
  DeleteCompanyProps,
  ErrorMessages,
  FindAssociatedCompaniesProps,
  FindCompanyByIdProps,
  PaginatedData,
  UpdateCompanyProps,
} from '@ap2/api-interfaces';
import { Controller, HttpStatus, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompaniesService } from './companies.service';

@Controller()
export class CompaniesController {
  private readonly logger: Logger = new Logger(CompaniesController.name);

  constructor(private readonly companyService: CompaniesService) {}

  @MessagePattern(CompanyMessagePatterns.CREATE_ASSOCIATE_COMPANY)
  async createAssociatedCompany(
    @Payload() payload: CreateCompanyProps
  ): Promise<CompanyDto> {
    return await this.companyService.createAssociatedCompany(
      payload.dto,
      payload.userId
    );
  }

  @MessagePattern(CompanyMessagePatterns.CREATE)
  async createCompany(
    @Payload() payload: CreateCompanyProps
  ): Promise<CompanyDto> {
    return await this.companyService.createCompanyOfEmployee(
      payload.dto,
      payload.userId
    );
  }

  @MessagePattern(CompanyMessagePatterns.READ_COMPANIES)
  async findAll(
    @Payload()
    payload: FindAssociatedCompaniesProps
  ): Promise<PaginatedData<CompanyDto>> {
    return await this.companyService.findAssociatedCompanies(
      payload.userId,
      payload.filters,
      payload.sorting,
      payload.page,
      payload.size
    );
  }

  @MessagePattern(CompanyMessagePatterns.READ_BY_ID)
  async findCompanyById(@Payload() payload: FindCompanyByIdProps) {
    return await this.companyService.findCompanyById(payload.id);
  }

  @MessagePattern(CompanyMessagePatterns.DELETE)
  async removeCompany(@Payload() payload: DeleteCompanyProps) {
    return await this.companyService.removeCompany(payload.id);
  }

  @MessagePattern(CompanyMessagePatterns.UPDATE)
  async updateCompany(@Payload() payload: UpdateCompanyProps) {
    return await this.companyService.updateCompany(payload.id, payload.dto);
  }

  @MessagePattern(CompanyMessagePatterns.READ_BY_USER_ID)
  async findCompanyByEmployeeId(@Payload() payload: FindCompanyByIdProps) {
    const company = await this.companyService.getCompanyForEmployee(payload.id);
    if (!company)
      throw new AmqpException(
        ErrorMessages.userHasNoCompany,
        HttpStatus.NOT_FOUND
      );

    return company;
  }
}
