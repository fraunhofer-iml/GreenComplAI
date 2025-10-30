/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportMessagePatterns } from '@ap2/amqp';
import {
  CreateReportProps,
  FindAllReportsForCompanyProps,
  PaginatedData,
  ReportEntity,
  ReportEntityOverview,
  UpdateFinancialImpactsProps,
  UpdateGoalsPlanningProps,
  UpdateGoalsProps,
  UpdateMeasuresProps,
  UpdateReportProps,
  UpdateStrategiesProps,
} from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  FinancialImpact,
  GoalPlanning,
  Measure,
  Strategy,
} from '@prisma/client';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @MessagePattern(ReportMessagePatterns.CREATE)
  async createReport(
    @Payload() reportDto: CreateReportProps
  ): Promise<ReportEntity> {
    return this.reportsService.createReport(reportDto.dto);
  }

  @MessagePattern(ReportMessagePatterns.GET_ALL_REPORTS)
  async getAllReports(
    @Payload() reportDto: FindAllReportsForCompanyProps
  ): Promise<PaginatedData<ReportEntityOverview>> {
    return this.reportsService.getAllReports(reportDto);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE)
  async updateReport(
    @Payload() reportDto: UpdateReportProps
  ): Promise<ReportEntity> {
    return this.reportsService.updateReport(reportDto.id, reportDto.dto);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE_STRATEGIES)
  async updateStrategies(
    @Payload() reportDto: UpdateStrategiesProps
  ): Promise<Strategy[]> {
    return this.reportsService.updateStrategies(reportDto.dtos, reportDto.id);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE_MEASURES)
  async updateMeasures(
    @Payload() reportDto: UpdateMeasuresProps
  ): Promise<Measure[]> {
    return this.reportsService.updateMeasures(reportDto.dtos, reportDto.id);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE_FINANCIAL_IMPACTS)
  async updateFinancialImpacts(
    @Payload() props: UpdateFinancialImpactsProps
  ): Promise<FinancialImpact[]> {
    return this.reportsService.updateFinancialImpacts(props.dtos, props.id);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE_GOALS)
  async updateGoals(@Payload() props: UpdateGoalsProps): Promise<ReportEntity> {
    return this.reportsService.createOrUpdateGoals(props.id, props.dto);
  }

  @MessagePattern(ReportMessagePatterns.UPDATE_GOAL_PLANNING)
  async updateGoalPlanning(
    @Payload() props: UpdateGoalsPlanningProps
  ): Promise<GoalPlanning | null> {
    return this.reportsService.updateGoalPlanning(props.id, props.dto);
  }

  @MessagePattern(ReportMessagePatterns.GET_REPORT_BY_ID)
  async getReportById(
    @Payload() payload: { id: string }
  ): Promise<ReportEntity | null> {
    return this.reportsService.getReportById(payload.id);
  }
}
