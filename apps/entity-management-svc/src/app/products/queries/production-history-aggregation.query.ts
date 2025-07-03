/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const productionHistoryAggregationQuery = (
  ids: string[],
  from: number,
  to: number
) =>
  ({
    where: {
      AND: [
        { productId: { in: ids } },
        { year: { gte: +from } },
        { year: { lte: +to } },
      ],
    },
    _sum: { amount: true },
    by: 'productId',
  }) satisfies Prisma.ProductionHistoryGroupByArgs;
