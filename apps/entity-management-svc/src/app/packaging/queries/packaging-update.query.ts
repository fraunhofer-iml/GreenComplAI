/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteCreateDto } from '@ap2/api-interfaces';
import { wasteMaterialUpdateQuery } from '../../products/queries/product-update.query';
import { createUtilizableAndNonUtilizableWaste } from '../../utils/waste-queries';

export const partPackagingConnectionUpdateQuery = (
  packaging: [string, number][],
  packagingId: string
) => ({
  where: { id: packagingId },
  data: {
    partPackagings: {
      upsert: packaging.map((packaging) => ({
        where: {
          partPackagingId_packagingId: {
            packagingId: packagingId,
            partPackagingId: packaging[0],
          },
        },
        create: {
          amount: packaging[1],
          packaging: { connect: { id: packaging[0] } },
        },
        update: {
          amount: packaging[1],
        },
      })),
    },
  },
});

export const packagingWasteUpdateQuery = (
  packagingId: string,
  dto: WasteCreateDto,
  wasteId: string
) => ({
  where: { id: packagingId },
  data: {
    waste: {
      update: {
        data: {
          recycledWastePercentage: dto.recycledWastePercentage,
          radioactiveAmount: dto.radioactiveAmount,
          normalWaste: createUtilizableAndNonUtilizableWaste(dto.normalWaste),
          hazardousWaste: dto.hazardousWaste
            ? createUtilizableAndNonUtilizableWaste(dto.hazardousWaste)
            : undefined,
          wasteMaterials: wasteMaterialUpdateQuery(dto.wasteMaterials, wasteId),
        },
      },
    },
  },
});
