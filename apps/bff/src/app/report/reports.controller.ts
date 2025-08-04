/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthRoles,
  CreateReportDto,
  FinancialImpactCreateDto,
  FinancialImpactDto,
  getRealmRole,
  MeasureDto,
  PaginatedData,
  ProductDto,
  ReportDto,
  ReportOverviewDto,
  StrategyDto,
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
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    description: 'Create new Report.',
  })
  @ApiBody({
    type: ReportDto,
  })
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOkResponse({
    description: 'Successfull request: Return created Reports',
    type: ReportDto,
  })
  create(@Body() reportCreateDto: CreateReportDto): Promise<ReportDto> {
    return this.reportsService.create(reportCreateDto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Get all Reports',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return a paginated list of Reports',
    type: PaginatedData<ReportOverviewDto | null>,
  })
  findAll(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('filters') filters?: string,
    @Query('sorting') sorting?: string
  ): Promise<PaginatedData<ReportOverviewDto>> {
    return this.reportsService.findAll({
      filters,
      sorting,
      page,
      size: pageSize,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Update Report.',
  })
  @ApiBody({
    type: ReportDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated report with id',
    type: ProductDto,
  })
  update(
    @Param('id') id: string,
    @Body() reportsUpdateDto: ReportDto
  ): Promise<ReportDto> {
    return this.reportsService.update(id, reportsUpdateDto);
  }

  @Patch(':id/strategies')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Update Report.',
  })
  @ApiBody({
    type: ReportDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated report with id',
    type: ProductDto,
  })
  updateStrategies(
    @Param('id') id: string,
    @Body() strategies: StrategyDto[]
  ): Promise<StrategyDto[]> {
    return this.reportsService.updateStrategies(id, strategies);
  }

  @Patch(':id/measures')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Update Report.',
  })
  @ApiBody({
    type: ReportDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated report with id',
    type: ProductDto,
  })
  updateMeasures(
    @Param('id') id: string,
    @Body() measures: MeasureDto[]
  ): Promise<MeasureDto[]> {
    return this.reportsService.updateMeasures(id, measures);
  }

  @Patch(':id/financial-impacts')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Update Report.',
  })
  @ApiBody({
    type: ReportDto,
  })
  @ApiOkResponse({
    description: 'Successfull request: Return updated report with id',
    type: ProductDto,
  })
  updateFinancialImpacts(
    @Param('id') id: string,
    @Body() measures: FinancialImpactCreateDto[]
  ): Promise<FinancialImpactDto[]> {
    return this.reportsService.updateFinancialImpacts(id, measures);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOperation({
    description: 'Get Report by id',
  })
  @ApiOkResponse({
    description: 'Successfull request: Return Report with id',
    type: ReportDto,
  })
  getById(@Param('id') id: string): Promise<ReportDto> {
    return this.reportsService.getById(id);
  }
}
