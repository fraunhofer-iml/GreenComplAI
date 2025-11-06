/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export type ReportEntity = Prisma.ReportGetPayload<{
  include: {
    strategies: true;
    measures: {
      include: {
        strategies: {
          include: {
            strategy: true;
          };
        };
        previousReport: true;
      };
    };
    financialImpacts: {
      include: {
        criticalAssumptions: true;
      };
    };
    goalPlanning: true;
    goals: {
      include: {
        strategies: {
          include: {
            strategy: true;
          };
        };
      };
    };
  };
}>;

export type ReportEntityOverview = Prisma.ReportGetPayload<{
  select: {
    id: true;
    evaluationYear: true;
    consultationsConducted: true;
    assetsBusinessActivitiesEvaluated: true;
    isFinalReport: true;
    measures: true;
    _count: {
      select: {
        measures: true;
        strategies: true;
        goals: true;
      };
    };
  };
}>;
