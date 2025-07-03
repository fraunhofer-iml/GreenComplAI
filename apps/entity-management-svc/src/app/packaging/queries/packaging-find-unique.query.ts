/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const packagingFindUniqueQuery = (id: string) =>
  ({
    where: {
      id: id,
    },
    include: {
      products: { include: { product: true } },
      waste: {
        include: {
          hazardousWaste: {
            include: { utilizableWaste: true, nonUtilizableWaste: true },
          },
          normalWaste: {
            include: { utilizableWaste: true, nonUtilizableWaste: true },
          },
          wasteMaterials: { include: { material: true } },
        },
      },
      material: true,
      supplier: { include: { addresses: true } },
    },
  }) satisfies Prisma.PackagingFindUniqueArgs;
