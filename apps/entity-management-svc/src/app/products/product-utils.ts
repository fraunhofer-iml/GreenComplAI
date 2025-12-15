/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';
import { getFilterAsBool } from '../utils/filter-utils';

export const getWhereCondition = (
  filter: string | undefined,
  isSellable?: boolean
): Prisma.ProductWhereInput => {
  const filterAsNumber = Number(filter);

  const conditions: Prisma.ProductWhereInput[] = [];
  if (isSellable !== undefined) {
    conditions.push({ isSellable });
  }

  const filterAsBool = getFilterAsBool(filter);

  if (filter && filter !== '') {
    const orCondition: Prisma.ProductWhereInput = {
      OR: [
        { productId: { contains: filter, mode: 'insensitive' } },
        { name: { contains: filter, mode: 'insensitive' } },
        { description: { contains: filter, mode: 'insensitive' } },
        { category: { contains: filter, mode: 'insensitive' } },
        { productGroup: { name: { contains: filter, mode: 'insensitive' } } },
        { wasteFlow: { name: { contains: filter, mode: 'insensitive' } } },
        { supplier: { name: { contains: filter, mode: 'insensitive' } } },
        {
          materials: {
            some: {
              material: { name: { contains: filter, mode: 'insensitive' } },
            },
          },
        },
        { circularPrinciple: { equals: filterAsBool } },
      ],
    };

    if (!Number.isNaN(filterAsNumber)) {
      const whereNumber: Prisma.ProductWhereInput[] = [
        { percentageOfBiologicalMaterials: { equals: filterAsNumber / 100 } },
      ];
      orCondition.OR = [...orCondition.OR, ...whereNumber];
    }

    conditions.push(orCondition);
  }

  return conditions.length > 0 ? { AND: conditions } : {};
};
