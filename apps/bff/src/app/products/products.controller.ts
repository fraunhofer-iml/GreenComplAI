/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AnalysisDto,
  AuthenticatedKCUser,
  AuthRoles,
  getRealmRole,
  PackagingDto,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  ProductOutlierDto,
  ProductUpdateDto,
  ProductUpdateHistoryDto,
  ProductUpdateMapDto,
  WasteCreateDto,
} from '@ap2/api-interfaces';
import { KeycloakUser, Roles } from 'nest-keycloak-connect';
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
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
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  private readonly logger: Logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    description: 'Create new product.',
  })
  @ApiBody({
    type: ProductCreateDto,
  })
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOkResponse({
    description: 'Successfull request: Return created product',
    type: ProductDto,
  })
  create(@Body() productCreateDto: ProductCreateDto): Promise<ProductDto> {
    return this.productsService.create({
      dto: productCreateDto,
    });
  }

  @Get()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER),
    getRealmRole(AuthRoles.SUPPLIER)
  )
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Get all products.',
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
    type: PaginatedData<ProductDto>,
  })
  findAll(
    @KeycloakUser() user: AuthenticatedKCUser,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('filters') filters?: string,
    @Query('sorting') sorting?: string,
    @Query('isSellable') isSellable?: boolean
  ): Promise<PaginatedData<ProductDto>> {
    return this.productsService.findAll(
      {
        filters,
        sorting,
        page,
        size: pageSize,
        isSellable,
      },
      user
    );
  }

  @Get('outliers')
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Get all products.',
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
  findAllOutliers() {
    return this.productsService.findOutliers();
  }

  @Get('search')
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Search all products for given value',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return deleted product with id',
    type: ProductDto,
    isArray: true,
  })
  searchProducts(@Query('value') value: string): Promise<ProductDto[]> {
    return this.productsService.search({ value });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Get one product by id.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return product with id',
    type: ProductDto,
  })
  findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne({ id });
  }

  @Get(':id/preliminary')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Get preliminary products of product by id.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return preliminary products',
    type: ProductDto,
  })
  findPreliminaryProducts(
    @Param('id') id: string
  ): Promise<[ProductDto, number][]> {
    return this.productsService.findPreliminary({ id });
  }

  @Get(':id/packaging')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Get packaging of product by id.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return packaging',
    type: PackagingDto,
  })
  fingPackagings(@Param('id') id: string): Promise<[PackagingDto, number][]> {
    return this.productsService.findPackaging({ id });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
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
    @Body() productUpdateDto: ProductUpdateDto
  ): Promise<ProductDto> {
    return this.productsService.update({
      id,
      dto: productUpdateDto,
    });
  }

  @Patch(':id/packaging')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Update packaging of product.',
  })
  @ApiBody({
    type: ProductUpdateDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  updatePackaging(
    @Param('id') id: string,
    @Body() productUpdateDto: ProductUpdateMapDto
  ): Promise<ProductDto> {
    return this.productsService.updatePackaging({
      id,
      dto: productUpdateDto,
    });
  }

  @Patch(':id/bill-of-material')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Update BOM of product.',
  })
  @ApiBody({
    type: ProductUpdateDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  updateBillOfMaterial(
    @Param('id') id: string,
    @Body() productUpdateDto: ProductUpdateMapDto
  ): Promise<ProductDto> {
    return this.productsService.updateBOM({
      id,
      dto: productUpdateDto,
    });
  }

  @Patch(':id/waste')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Update waste of product.',
  })
  @ApiBody({
    type: ProductUpdateDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  updateWaste(
    @Param('id') id: string,
    @Body() productUpdateDto: WasteCreateDto
  ): Promise<ProductDto> {
    return this.productsService.updateWaste({
      id,
      dto: productUpdateDto,
    });
  }

  @Patch(':id/flags')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Update flags of product.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  updateFlags(@Param('id') id: string, @Body() data: { flags: string[] }) {
    return this.productsService.updateFlags({
      id,
      dto: { flags: data.flags },
    });
  }

  @Patch(':id/production-history')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Update production history  of product.',
  })
  @ApiBody({
    type: ProductUpdateDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  updateProductionHistory(
    @Param('id') id: string,
    @Body() productUpdateDto: ProductUpdateHistoryDto
  ): Promise<ProductDto> {
    return this.productsService.updateProductionHistory({
      id,
      dto: productUpdateDto,
    });
  }

  @Patch(':id/outlier')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'validate outlier.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated product with id',
    type: ProductDto,
  })
  validateOutlier(
    @Param('id') id: string,
    @Body() data: { flags: string[] }
  ): Promise<ProductOutlierDto> {
    return this.productsService.validate({ id, dto: { flags: data.flags } });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    description: 'Delete one product.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return deleted product with id',
    type: ProductDto,
  })
  remove(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.remove({ id });
  }

  @Get(':id/analysis')
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'Generates an analysis for the specified product id and returns it.',
  })
  @ApiOkResponse({
    description: 'Returns the generated analysis of the specified product.',
  })
  getAnalysis(
    @Param('id') id: string,
    @Query('amount') amount: number,
    @KeycloakUser() user: AuthenticatedKCUser
  ): Promise<AnalysisDto> {
    return this.productsService.getAnalysis({
      productId: id,
      amount: amount,
      userId: user.sub,
    });
  }
}
