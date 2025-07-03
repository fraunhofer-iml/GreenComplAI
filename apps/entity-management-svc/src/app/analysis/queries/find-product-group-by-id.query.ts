/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const findProductsByGroupIdQuery = (id: string) =>
  ({
    where: { productGroupId: id },
    include: {
      billOfMaterial: {
        include: {
          preliminaryProduct: {
            include: {
              materials: { include: { material: true } },
              packagings: {
                include: {
                  packaging: {
                    include: {
                      partPackagings: { include: { packaging: true } },
                    },
                  },
                },
              },
              criticalRawMaterials: { include: { material: true } },
              rareEarths: { include: { material: true } },
            },
          },
        },
      },
    },
  }) satisfies Prisma.ProductFindManyArgs;
