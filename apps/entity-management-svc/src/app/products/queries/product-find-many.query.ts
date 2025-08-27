/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const productFindManyQuery = ({
  filters,
  size,
  skip,
  sorting,
}: {
  skip: number;
  size: number;
  filters: Prisma.ProductWhereInput;
  sorting: string;
}) =>
  ({
    skip: skip,
    take: size,
    where: filters,
    include: {
      manufacturer: {
        include: {
          addresses: true,
        },
      },
      materials: {
        include: {
          material: true,
        },
      },
      supplier: {
        include: {
          addresses: true,
        },
      },
      importer: {
        include: {
          addresses: true,
        },
      },
      waste: {
        include: {
          wasteMaterials: {
            include: {
              material: true,
            },
          },
        },
      },
      wasteFlow: true,
      productGroup: true,
      rareEarths: { include: { material: true } },
      criticalRawMaterials: { include: { material: true } },
    },
    orderBy: JSON.parse(sorting || '{}'),
  }) satisfies Prisma.ProductFindManyArgs;
