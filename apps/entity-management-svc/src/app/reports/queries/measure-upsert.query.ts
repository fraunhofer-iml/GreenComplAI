/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasureCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';

export const upsertMeasures = (measure: MeasureCreateDto, reportId: string) =>
  ({
    where: { id: measure.id ?? '' },
    create: {
      title: measure.title,
      status: measure.status,
      expectedResult: measure.expectedResult,
      contributionAchievingStrategy: measure.contributionAchievingStrategy,
      plannedCompletion: measure.plannedCompletion,
      impactOnValueChainAndStakeholders:
        measure.impactOnValueChainAndStakeholders,
      reportId: reportId,
      previousReportId: undefined,
      strategies: {
        create: measure.strategies.map((id) => ({
          strategy: { connect: { id: id } },
        })),
      },
    },
    update: {
      title: measure.title,
      status: measure.status,
      expectedResult: measure.expectedResult,
      contributionAchievingStrategy: measure.contributionAchievingStrategy,
      plannedCompletion: measure.plannedCompletion,
      impactOnValueChainAndStakeholders:
        measure.impactOnValueChainAndStakeholders,
      reportId: reportId,

      strategies: {
        upsert: measure.strategies.map((s) => ({
          where: {
            measureId_strategyId: {
              measureId: measure.id,
              strategyId: s,
            },
          },
          update: {},
          create: {
            strategyId: s,
          },
        })),
        deleteMany: {
          AND: [
            {
              strategyId: {
                notIn: measure.strategies.map((i) => i ?? ''),
              },
            },
          ],
        },
      },
    },
  }) satisfies Prisma.MeasureUpsertArgs;
