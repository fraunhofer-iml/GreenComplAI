/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalDto } from '@ap2/api-interfaces';

export const updateGoalQuery = (goal: GoalDto) => ({
  where: { id: goal.id },
  data: {
    ...goal,
    strategies: {
      upsert: goal.strategies.map((connectedStrategy) => ({
        where: {
          goalId_strategyId: {
            goalId: goal.id,
            strategyId: connectedStrategy.id,
          },
        },
        update: { connection: connectedStrategy.connection },
        create: {
          strategyId: connectedStrategy.id,
          connection: connectedStrategy.connection,
        },
      })),
      deleteMany: {
        AND: [
          {
            strategyId: {
              notIn: goal.strategies.map(
                (connectedStrategy) => connectedStrategy.id ?? ''
              ),
            },
          },
          { goalId: goal.id },
        ],
      },
    },
  },
});
