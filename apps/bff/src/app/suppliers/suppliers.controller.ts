/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthenticatedKCUser,
  AuthRoles,
  getRealmRole,
  PaginatedData,
  ProductDto,
  ProductUpdateDto,
} from '@ap2/api-interfaces';
import { KeycloakUser, Roles } from 'nest-keycloak-connect';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('products')
  @Roles(getRealmRole(AuthRoles.SUPPLIER))
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Get all products of the supplier.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
  })
  @ApiQuery({
    name: 'isSellable',
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
    description: 'Successfull request: Return paginated products',
    type: PaginatedData<Partial<ProductDto>>,
  })
  async getAllProductsForSupplier(
    @KeycloakUser() user: AuthenticatedKCUser,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('filters') filters?: string,
    @Query('sorting') sorting?: string,
    @Query('isSellable') isSellable?: boolean
  ) {
    return this.suppliersService.findAllForSupplier(
      {
        page,
        size: pageSize,
        filters: filters,
        sorting: sorting,
        isSellable,
      },
      user
    );
  }

  @Get('products/:id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUPPLIER))
  @ApiOperation({
    description: 'Get one product by id for suppliers.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return product with id',
    type: ProductDto,
  })
  findOne(
    @Param('id') id: string,
    @KeycloakUser() user: AuthenticatedKCUser
  ): Promise<Partial<ProductDto>> {
    return this.suppliersService.findOneOfSupplier({ id }, user);
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUPPLIER))
  @ApiOperation({
    description: 'Update master data  of product.',
  })
  @ApiBody({
    type: ProductUpdateDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  update(
    @Param('id') id: string,
    @Body() productUpdateDto: ProductUpdateDto,
    @KeycloakUser() user: AuthenticatedKCUser
  ): Promise<ProductDto> {
    return this.suppliersService.update(
      {
        id,
        dto: productUpdateDto,
      },
      user
    );
  }
}
