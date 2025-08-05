/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles, getRealmRole, MappingDto } from '@ap2/api-interfaces';
import { Roles } from 'nest-keycloak-connect';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MappingsService } from './mappings.service';

@ApiTags('Mappings')
@Controller('mappings')
export class MappingsController {
  constructor(private readonly mappingService: MappingsService) {}

  @Post()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiBearerAuth()
  @ApiOperation({
    description: 'Creates a new Mapping.',
  })
  @ApiCreatedResponse({ description: 'Successfully created' })
  @ApiBody({
    type: MappingDto,
  })
  @ApiOkResponse({
    description: 'Created Mapping',
    type: MappingDto,
  })
  async createMapping(
    @Body() createMappingDto: MappingDto
  ): Promise<MappingDto> {
    return await this.mappingService.createMapping({ dto: createMappingDto });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(
    getRealmRole(AuthRoles.BUYER),
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER)
  )
  @ApiOperation({
    description: 'Get one mapping by id.',
  })
  @ApiOkResponse({
    description: 'Successfull Request: Return mapping with id',
    type: MappingDto,
  })
  findOne(@Param('id') id: string): Promise<MappingDto> {
    return this.mappingService.findOne({ id: id });
  }
}
