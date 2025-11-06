/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductGroupCreateDto } from '@ap2/api-interfaces';

export const productGroupCreateQuery = (dto: ProductGroupCreateDto) => ({
  data: {
    description: dto.description?.toString() ?? 'N/A',
    name: dto.name?.toString() ?? 'N/A',
    wasteFlow: dto.wasteFlow
      ? {
          connectOrCreate: {
            where: {
              name: dto.wasteFlow,
            },
            create: {
              name: dto.wasteFlow,
            },
          },
        }
      : undefined,
    variants: dto.variants
      ? {
          create: Array.from(dto.variants ?? []).map((variant) => ({
            name: variant?.toString() ?? 'N/A',
          })),
        }
      : undefined,
    flags: dto.flags,
  },
  include: {
    variants: true,
    _count: {
      select: {
        products: true,
      },
    },
  },
});
