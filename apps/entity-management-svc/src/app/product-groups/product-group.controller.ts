/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductGroupMessagePatterns } from '@ap2/amqp';
import {
  CreateProductGroupProps,
  FindAllProductGroupsProps,
  FindProductGroupByIdProps,
  PaginatedData,
  ProductGroupEntity,
  ProductGroupEntityList,
  UpdateProductGroupProps,
} from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductGroupService } from './product-group.service';

@Controller('productgroup')
export class ProductGroupController {
  constructor(private readonly productGroupService: ProductGroupService) {}

  @MessagePattern(ProductGroupMessagePatterns.CREATE)
  create(
    @Payload() payload: CreateProductGroupProps
  ): Promise<ProductGroupEntity> {
    return this.productGroupService.create(payload);
  }

  @MessagePattern(ProductGroupMessagePatterns.READ_ALL)
  findAll(
    @Payload() payload: FindAllProductGroupsProps
  ): Promise<PaginatedData<ProductGroupEntityList>> {
    return this.productGroupService.findAll(payload);
  }

  @MessagePattern(ProductGroupMessagePatterns.READ_BY_ID)
  async findOne(
    @Payload() payload: FindProductGroupByIdProps
  ): Promise<ProductGroupEntity | null> {
    return this.productGroupService.findOne(payload);
  }

  @MessagePattern(ProductGroupMessagePatterns.UPDATE)
  async update(
    @Payload() payload: UpdateProductGroupProps
  ): Promise<ProductGroupEntity> {
    return this.productGroupService.update(payload.id, payload.dto);
  }
}
