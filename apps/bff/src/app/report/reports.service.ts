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
  GoalReportDto,
  MeasureDto,
  PaginatedData,
  ReportDto,
  ReportOverviewDto,
  StrategyDto,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export class ReportsService {
  private readonly logger: Logger;

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {
    this.logger = new Logger(ReportsService.name);
  }

  async create(props: CreateReportDto): Promise<ReportDto> {
    return firstValueFrom(
      this.entityManagementService.send<ReportDto>(
        ReportMessagePatterns.CREATE,
        {
          dto: props,
        }
      )
    );
  }

  async findAll(
    props: FindAllReportsForCompanyProps
  ): Promise<PaginatedData<ReportOverviewDto>> {
    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ReportOverviewDto>>(
        ReportMessagePatterns.GET_ALL_REPORTS,
        props
      )
    );
  }

  async update(id: string, dto: ReportDto): Promise<ReportDto> {
    return firstValueFrom(
      this.entityManagementService.send<ReportDto>(
        ReportMessagePatterns.UPDATE,
        {
          id,
          dto,
        }
      )
    );
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

  async updateGoals(id: string, dto: GoalReportDto): Promise<GoalReportDto> {
    return firstValueFrom(
      this.entityManagementService.send<GoalReportDto>(
        ReportMessagePatterns.UPDATE_GOALS,
        {
          id,
          dto,
        }
      )
    );
  }

  getById(id: string): Promise<ReportDto> {
    return firstValueFrom(
      this.entityManagementService.send<ReportDto>(
        ReportMessagePatterns.GET_REPORT_BY_ID,
        { id }
      )
    );
  }
}
