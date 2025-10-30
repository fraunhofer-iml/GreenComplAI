/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';
import { getSorting } from '../../utils/sorting.util';

export const productGroupFindManyQuery = ({
  where,
  size,
  skip,
  sorting,
}: {
  skip: number;
  size: number;
  where: Prisma.ProductGroupWhereInput;
  sorting: string;
}) =>
  ({
    skip: skip,
    take: size,
    where: where,
    include: {
      _count: {
        select: { products: true },
      },
      products: {
        include: {
          waste: true,
        },
      },
      wasteFlow: true,
      variants: true,
    },
    orderBy: getSorting(
      sorting || '{}'
    ) as Prisma.ProductGroupOrderByWithRelationInput,
  }) satisfies Prisma.ProductGroupFindManyArgs;
