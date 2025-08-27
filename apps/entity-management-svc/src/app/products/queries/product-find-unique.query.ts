/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const productFindUniqueQuery = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      productionHistory: {
        select: {
          amount: true,
          year: true,
        },
        orderBy: {
          year: 'desc',
        },
      },
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
          normalWaste: {
            include: {
              nonUtilizableWaste: true,
              utilizableWaste: true,
            },
          },
          hazardousWaste: {
            include: {
              nonUtilizableWaste: true,
              utilizableWaste: true,
            },
          },
        },
      },
      productGroup: { include: { variants: true } },
      warehouseLocation: true,
      productionLocation: true,
      wasteFlow: true,
      rareEarths: { include: { material: true } },
      criticalRawMaterials: { include: { material: true } },
    },
  }) satisfies Prisma.ProductFindUniqueArgs;
