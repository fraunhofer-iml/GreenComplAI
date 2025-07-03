/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthRoles,
  getRealmRole,
  PaginatedData,
  ProductDto,
  ProductGroupCreateDto,
  ProductGroupDto,
} from '@ap2/api-interfaces';
import { Roles } from 'nest-keycloak-connect';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductGroupService } from './product-group.service';

@ApiTags('Productgroups')
@Controller('product-groups')
export class ProductGroupController {
  constructor(private readonly productGroupService: ProductGroupService) {}

  @Post()
  @ApiOperation({
    description: 'Create new group.',
  })
  @ApiBody({
    type: ProductGroupCreateDto,
  })
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiOkResponse({
    description: 'Successfull request: Return created product group',
    type: ProductGroupDto,
  })
  create(
    @Body() productCreateDto: ProductGroupCreateDto
  ): Promise<ProductGroupDto> {
    return this.productGroupService.create({
      dto: productCreateDto,
    });
  }

  @Get()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Get all product groups.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
  })
  @ApiQuery({
    name: 'sorting',
    required: false,
    examples: {
      noSorting: { value: null },
      name: { value: { name: 'asc' } },
    },
  })
  @ApiOkResponse({
    description: 'Successfull request: Return paginated product groups',
    type: PaginatedData<ProductDto>,
  })
  findAll(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('filters') filters?: string,
    @Query('sorting') sorting?: string
  ): Promise<PaginatedData<ProductGroupDto>> {
    return this.productGroupService.findAll({
      filters,
      sorting,
      page,
      size: pageSize,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiOperation({
    description: 'Get one product by id.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return product group with id',
    type: ProductDto,
  })
  findOne(@Param('id') id: string): Promise<ProductGroupDto> {
    return this.productGroupService.findOne({ id });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  update(
    @Param('id') id: string,
    @Body() dto: ProductGroupCreateDto
  ): Promise<ProductGroupDto> {
    return this.productGroupService.update({ dto, id });
  }
}
