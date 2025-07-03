/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalysisQuery } from '@ap2/amqp';
import {
  AuthRoles,
  getRealmRole,
  InFlowAnalysisDto,
  WasteFlowAnalysisDto,
} from '@ap2/api-interfaces';
import { Roles } from 'nest-keycloak-connect';
import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
@ApiTags('Analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('out')
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'Generates an analysis for the specified product id and returns it.',
  })
  @ApiOkResponse({
    description: 'Returns the generated analysis of the specified product.',
  })
  @ApiQuery({ name: 'productGroupId', required: false })
  getWasteFlowAnalysis(
    @Query()
    query: AnalysisQuery
  ): Promise<WasteFlowAnalysisDto> {
    return this.analysisService.getWasteFlowAnalysis(query);
  }

  @Get('in')
  @Roles({
    roles: [
      getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
      getRealmRole(AuthRoles.BUYER),
    ],
  })
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'Generates an analysis for the specified product id and returns it.',
  })
  @ApiOkResponse({
    description: 'Returns the generated analysis of the specified product.',
  })
  @ApiQuery({ name: 'fromYear' })
  @ApiQuery({ name: 'toYear' })
  @ApiQuery({ name: 'productGroupId', required: false })
  getInflowAnalysis(
    @Query()
    query: AnalysisQuery
  ): Promise<InFlowAnalysisDto> {
    return this.analysisService.getInFlowAnalysis(query);
  }
}
