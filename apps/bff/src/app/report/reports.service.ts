/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, ReportMessagePatterns } from '@ap2/amqp';
import {
  CreateReportDto,
  FinancialImpactCreateDto,
  FinancialImpactDto,
  FindAllReportsForCompanyProps,
  GoalDto,
  GoalPlanningDto,
  MeasureDto,
  PaginatedData,
  ReportDto,
  ReportEntity,
  ReportEntityOverview,
  ReportOverviewDto,
  StrategyDto,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { toReportDto, toReportOverviewDto } from './report.mapper';

export class ReportsService {
  private readonly logger: Logger;

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {
    this.logger = new Logger(ReportsService.name);
  }

  async create(props: CreateReportDto): Promise<ReportDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ReportEntity>(
        ReportMessagePatterns.CREATE,
        {
          dto: props,
        }
      )
    );
    return toReportDto(entity);
  }

  async findAll(
    props: FindAllReportsForCompanyProps
  ): Promise<PaginatedData<ReportOverviewDto>> {
    const result = await firstValueFrom(
      this.entityManagementService.send<PaginatedData<ReportEntityOverview>>(
        ReportMessagePatterns.GET_ALL_REPORTS,
        props
      )
    );
    return {
      data: result.data.map((entity) => toReportOverviewDto(entity)),
      meta: result.meta,
    };
  }

  async update(id: string, dto: CreateReportDto): Promise<ReportDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ReportEntity>(
        ReportMessagePatterns.UPDATE,
        {
          id,
          dto,
        }
      )
    );
    return toReportDto(entity);
  }

  async updateStrategies(
    id: string,
    dtos: StrategyDto[]
  ): Promise<StrategyDto[]> {
    return firstValueFrom(
      this.entityManagementService.send<StrategyDto[]>(
        ReportMessagePatterns.UPDATE_STRATEGIES,
        {
          id,
          dtos,
        }
      )
    );
  }

  async updateMeasures(id: string, dtos: MeasureDto[]): Promise<MeasureDto[]> {
    return firstValueFrom(
      this.entityManagementService.send<MeasureDto[]>(
        ReportMessagePatterns.UPDATE_MEASURES,
        {
          id,
          dtos,
        }
      )
    );
  }

  async updateFinancialImpacts(
    id: string,
    dtos: FinancialImpactCreateDto[]
  ): Promise<FinancialImpactDto[]> {
    return firstValueFrom(
      this.entityManagementService.send<FinancialImpactDto[]>(
        ReportMessagePatterns.UPDATE_FINANCIAL_IMPACTS,
        {
          id,
          dtos,
        }
      )
    );
  }

  async updateGoals(id: string, dto: GoalDto[]): Promise<ReportDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ReportEntity>(
        ReportMessagePatterns.UPDATE_GOALS,
        {
          id,
          dto,
        }
      )
    );
    return toReportDto(entity);
  }
  async updateGoalPlanning(
    id: string,
    dto: GoalPlanningDto
  ): Promise<ReportDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ReportEntity>(
        ReportMessagePatterns.UPDATE_GOAL_PLANNING,
        {
          id,
          dto,
        }
      )
    );
    return toReportDto(entity);
  }

  async getById(id: string): Promise<ReportDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ReportEntity | null>(
        ReportMessagePatterns.GET_REPORT_BY_ID,
        { id }
      )
    );
    return toReportDto(entity);
  }
}
