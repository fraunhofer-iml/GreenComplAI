/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalDto } from '@ap2/api-interfaces';

export const createGoalQuery = (goal: Partial<GoalDto>, reportId: string) => ({
  data: {
    ...goal,
    validityPeriodEnd: goal.validityPeriodEnd,
    validityPeriodStart: goal.validityPeriodStart,
    strategies: {
      create: goal.strategies.map((connectedStrategy) => ({
        strategy: { connect: { id: connectedStrategy.id } },
        connection: connectedStrategy.connection,
      })),
    },
    reportId: reportId,
  },
});
