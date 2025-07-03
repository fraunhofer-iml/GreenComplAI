/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, ProductGroupMessagePatterns } from '@ap2/amqp';
import {
  CreateProductGroupProps,
  FindAllProductGroupsProps,
  FindProductGroupByIdProps,
  PaginatedData,
  ProductGroupDto,
  UpdateProductGroupProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ProductGroupService {
  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  create(props: CreateProductGroupProps): Promise<ProductGroupDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductGroupDto>(
        ProductGroupMessagePatterns.CREATE,
        props
      )
    );
  }

  findAll(
    props: FindAllProductGroupsProps
  ): Promise<PaginatedData<ProductGroupDto>> {
    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductGroupDto>>(
        ProductGroupMessagePatterns.READ_ALL,
        props
      )
    );
  }

  findOne(props: FindProductGroupByIdProps): Promise<ProductGroupDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductGroupDto>(
        ProductGroupMessagePatterns.READ_BY_ID,
        props
      )
    );
  }

  update(props: UpdateProductGroupProps): Promise<ProductGroupDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductGroupDto>(
        ProductGroupMessagePatterns.UPDATE,
        props
      )
    );
  }
}
