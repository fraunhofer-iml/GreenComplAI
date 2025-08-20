/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalPlanningDto } from '@ap2/api-interfaces';

export const createUpdateGoalsPlanningQuery = (planning: GoalPlanningDto) => ({
  hasPlannedGoals: planning.hasPlannedGoals,
  deadlineEnd: planning.hasPlannedGoals ? planning.deadlineEnd : null,
  deadlineStart: planning.hasPlannedGoals ? planning.deadlineStart : null,
  followUpProcedure: planning.goalsTracked ? planning.followUpProcedure : null,
  progressEvaluation: planning.goalsTracked
    ? planning.progressEvaluation
    : null,
  referencePeriodForProgressEnd: planning.goalsTracked
    ? planning.referencePeriodForProgressEnd
    : null,
  referencePeriodForProgressStart: planning.goalsTracked
    ? planning.referencePeriodForProgressStart
    : null,
  targets: planning.goalsTracked ? planning.targets : null,
  goalsTracked: planning.goalsTracked,
  noGoalsExplanation: !planning.hasPlannedGoals
    ? planning.noGoalsExplanation
    : null,
});
