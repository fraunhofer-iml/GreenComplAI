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
  ProductGroupEntity,
  ProductGroupEntityList,
  UpdateProductGroupProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  toProductGroupDto,
  toProductGroupDtoList,
} from './product-group.mapper';

@Injectable()
export class ProductGroupService {
  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  async create(props: CreateProductGroupProps): Promise<ProductGroupDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductGroupEntity>(
        ProductGroupMessagePatterns.CREATE,
        props
      )
    );
    return toProductGroupDto(entity);
  }

  async findAll(
    props: FindAllProductGroupsProps
  ): Promise<PaginatedData<ProductGroupDto>> {
    const result = await firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductGroupEntityList>>(
        ProductGroupMessagePatterns.READ_ALL,
        props
      )
    );
    return {
      data: result.data.map((entity) => toProductGroupDtoList(entity)),
      meta: result.meta,
    };
  }

  async findOne(
    props: FindProductGroupByIdProps
  ): Promise<ProductGroupDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductGroupEntity | null>(
        ProductGroupMessagePatterns.READ_BY_ID,
        props
      )
    );
    return toProductGroupDto(entity);
  }

  async update(props: UpdateProductGroupProps): Promise<ProductGroupDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductGroupEntity>(
        ProductGroupMessagePatterns.UPDATE,
        props
      )
    );
    return toProductGroupDto(entity);
  }
}
