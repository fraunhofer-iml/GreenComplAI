/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalCreateDto } from './goal-create.dto';

export class GoalReportDto {
  id?: string;
  noGoalsExplanation?: string;
  hasPlannedGoals?: boolean;
  followUpProcedure?: string;
  targets?: string;
  progressEvaluation?: string;
  referencePeriodForProgressStart?: Date;
  referencePeriodForProgressEnd?: Date;
  deadlineStart?: Date;
  deadlineEnd?: Date;
  goalsTracked?: boolean;

  goals: GoalCreateDto[] = [];
}
export class GoalPlanningtDto {
  id?: string;
  noGoalsExplanation?: string;
  hasPlannedGoals?: boolean;
  followUpProcedure?: string;
  targets?: string;
  progressEvaluation?: string;
  referencePeriodForProgressStart?: Date;
  referencePeriodForProgressEnd?: Date;
  deadlineStart?: Date;
  deadlineEnd?: Date;
  goalsTracked?: boolean;

  goals: GoalCreateDto[] = [];
}
