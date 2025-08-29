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
  PackagingCreateDto,
  PackagingDto,
  PackagingUpdateDto,
  PaginatedData,
} from '@ap2/api-interfaces';
import { Roles } from 'nest-keycloak-connect';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PackagingService } from './packaging.service';

@ApiTags('Packaging')
@Controller('packaging')
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.BUYER))
  @ApiOperation({
    description: 'Creates a new packages.',
  })
  @ApiCreatedResponse({ description: 'Successfully created' })
  @ApiBody({
    type: PackagingDto,
  })
  @ApiOkResponse({
    description: 'Created Package',
    type: PackagingDto,
  })
  async create(
    @Body() createPackagingDto: PackagingCreateDto
  ): Promise<PackagingDto> {
    return await this.packagingService.createPackaging({
      dto: createPackagingDto,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.BUYER),
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER)
  )
  @ApiOperation({
    description: 'Get one Packaging by id.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return packaging with id',
  })
  findOne(@Param('id') id: string): Promise<PackagingDto> {
    return this.packagingService.findOne({ id: id });
  }

  @Get(':id/preliminary')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.BUYER),
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER)
  )
  @ApiOperation({
    description: 'Get one Packaging by id.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return packaging with id',
  })
  findPartPackagigns(
    @Param('id') id: string
  ): Promise<[PackagingDto, number][]> {
    return this.packagingService.findPreliminary({ id: id });
  }

  @Get()
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.BUYER),
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER)
  )
  @ApiOperation({
    description: 'Get all packaging.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return packaging with id',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
  })
  @ApiQuery({
    name: 'sorting',
    required: false,
  })
  findAll(
    @Query('filters') filters?: string,
    @Query('sorting') sorting?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ): Promise<PaginatedData<PackagingDto>> {
    return this.packagingService.findAll({
      filters: filters,
      sorting: sorting,
      page: page,
      size: pageSize,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.BUYER))
  @ApiOperation({
    description: 'Update packaging.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated package with id',
  })
  update(
    @Param('id') id: string,
    @Body() dto: PackagingUpdateDto
  ): Promise<PackagingDto> {
    return this.packagingService.update({ id: id, dto: dto });
  }

  @Patch(':id/preliminary')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.BUYER))
  @ApiOperation({
    description: 'Update packaging.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated package with id',
  })
  updatePartPackagigns(
    @Param('id') id: string,
    @Body() dto: PackagingUpdateDto
  ): Promise<void> {
    return this.packagingService.updatePartPackagigns({ id: id, dto: dto });
  }

  @Patch(':id/waste')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.BUYER))
  @ApiOperation({
    description: 'Update packaging.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated package with id',
  })
  updateWaste(
    @Param('id') id: string,
    @Body() dto: PackagingUpdateDto
  ): Promise<void> {
    return this.packagingService.updateWaste({ id: id, dto: dto });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.BUYER))
  @ApiOperation({
    description: 'Update packaging.',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated package with id',
  })
  delete(@Param('id') id: string): Promise<void> {
    return this.packagingService.delete({ id: id });
  }
}
