/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasureDto } from '../measures';
import { FinancialImpactDto } from './financial-impact.dto';
import { GoalDto } from './goal-create.dto';
import { GoalPlanningDto } from './goal.report.dto';
import { StrategyDto } from './strategy.dto';

export class ReportDto {
  id: string;
  assetsBusinessActivitiesEvaluated: boolean;
  evaluationMethodsAssumptionsTools: string;
  consultationsConducted: boolean;
  consultationMethods: string;
  evaluationYear: number;
  isFinalReport: boolean;

  strategies: StrategyDto[];

  measures: MeasureDto[];

  financialImpacts: FinancialImpactDto[];

  goalPlanning?: GoalPlanningDto;
  goals: GoalDto[];

  flags: string[];

  constructor(
    id: string,
    assetsBusinessActivitiesEvaluated: boolean,
    evaluationMethodsAssumptionsTools: string,
    consultationsConducted: boolean,
    consultationMethods: string,
    evaluationYear: number,
    isFinalReport: boolean,
    strategies: StrategyDto[],
    measures: MeasureDto[],
    financialImpacts: FinancialImpactDto[],
    goalPlanning: GoalPlanningDto,
    goals: GoalDto[],
    flags: string[]
  ) {
    this.id = id;
    this.assetsBusinessActivitiesEvaluated = assetsBusinessActivitiesEvaluated;
    this.evaluationMethodsAssumptionsTools = evaluationMethodsAssumptionsTools;
    this.consultationsConducted = consultationsConducted;
    this.consultationMethods = consultationMethods;
    this.evaluationYear = evaluationYear;
    this.isFinalReport = isFinalReport;
    this.strategies = strategies;
    this.measures = measures;
    this.financialImpacts = financialImpacts;
    this.flags = flags;
    this.goalPlanning = goalPlanning;
    this.goals = goals;
  }
}
