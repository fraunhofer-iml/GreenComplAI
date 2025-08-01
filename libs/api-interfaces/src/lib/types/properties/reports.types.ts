/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreateReportDto,
  FinancialImpactCreateDto,
  GoalPlanningtDto,
  MeasureCreateDto,
  ReportDto,
  StrategyDto,
} from '../../dtos';

export type FindAllReportsForCompanyProps = {
  filters?: string;
  sorting?: string;
  page: number;
  size: number;
};

export type CreateReportProps = {
  dto: ReportDto;
};

export type UpdateReportProps = {
  id: string;
  dto: CreateReportDto;
};

export type UpdateStrategiesProps = {
  id: string;
  dtos: StrategyDto[];
};

export type UpdateMeasuresProps = {
  id: string;
  dtos: MeasureCreateDto[];
};

export type UpdateFinancialImpactsProps = {
  id: string;
  dtos: FinancialImpactCreateDto[];
};

export type UpdateGoalsProps = {
  id: string;
  dto: GoalPlanningtDto;
};
