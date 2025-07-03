/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, CompanyMessagePatterns } from '@ap2/amqp';
import {
  CompanyDto,
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

@Injectable()
export class CompaniesService {
  private readonly logger: Logger = new Logger(CompaniesService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  createCompany(props: CreateCompanyProps): Promise<CompanyDto> {
    return firstValueFrom(
      this.entityManagementService.send<CompanyDto>(
        CompanyMessagePatterns.CREATE,
        props
      )
    );
  }

  createAssociatedCompany(props: CreateCompanyProps): Promise<CompanyDto> {
    return firstValueFrom(
      this.entityManagementService.send<CompanyDto>(
        CompanyMessagePatterns.CREATE_ASSOCIATE_COMPANY,
        props
      )
    );
  }

  findAllAssociatedCompanies(
    props: FindAssociatedCompaniesProps
  ): Promise<PaginatedData<CompanyDto[]>> {
    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<CompanyDto[]>>(
        CompanyMessagePatterns.READ_COMPANIES,
        props
      )
    );
  }

  findOne(props: FindCompanyByIdProps): Promise<CompanyDto> {
    return firstValueFrom(
      this.entityManagementService.send<CompanyDto>(
        CompanyMessagePatterns.READ_BY_ID,
        props
      )
    );
  }

  update(props: UpdateCompanyProps): Promise<CompanyDto> {
    return firstValueFrom(
      this.entityManagementService.send<CompanyDto>(
        CompanyMessagePatterns.UPDATE,
        props
      )
    );
  }

  remove(props: DeleteCompanyProps): Promise<void> {
    return firstValueFrom(
      this.entityManagementService.send(CompanyMessagePatterns.DELETE, props)
    );
  }

  findOneByUserId(props: FindCompanyByIdProps): Promise<CompanyDto> {
    return firstValueFrom(
      this.entityManagementService.send<CompanyDto>(
        CompanyMessagePatterns.READ_BY_USER_ID,
        props
      )
    );
  }
}
