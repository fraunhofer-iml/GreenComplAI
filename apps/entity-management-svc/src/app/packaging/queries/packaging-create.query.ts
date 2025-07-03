/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';
import { createUtilizableAndNonUtilizableWaste } from '../../utils/waste-queries';

export const packagingCreateQuery = (dto: PackagingCreateDto) =>
  ({
    data: {
      weight: Number(dto.weight) || 0,
      name: dto.name?.toString() ?? 'N/A',
      percentageOfRenewableMaterial:
        Number(dto.percentageOfRenewableMaterial) || 0,
      percentageOfRecycledMaterial:
        Number(dto.percentageOfRecycledMaterial) || 0,
      percentageOfRStrategies: Number(dto.percentageOfRStrategies) || 0,
      supplier: {
        connectOrCreate: {
          where: { id: dto.supplierId ?? 'N/A' },
          create: {
            id: dto.supplierId ?? 'N/A',
            name: dto.supplierId ?? 'N/A',
          },
        },
      },
      material: {
        connectOrCreate: {
          where: { name: dto.materialId?.toString() ?? 'N/A' },
          create: { name: dto.materialId?.toString() ?? 'N/A' },
        },
      },
      waste: dto.waste
        ? {
            create: {
              recycledWastePercentage:
                Number(dto.waste.recycledWastePercentage) || 0,
              radioactiveAmount: Number(dto.waste.radioactiveAmount) || 0,
              normalWaste: dto.waste.normalWaste
                ? createUtilizableAndNonUtilizableWaste(dto.waste.normalWaste)
                : undefined,
              hazardousWaste: dto.waste.hazardousWaste
                ? createUtilizableAndNonUtilizableWaste(
                    dto.waste.hazardousWaste
                  )
                : undefined,
            },
          }
        : undefined,
    },
    include: {
      waste: true,
      material: true,
      supplier: { include: { addresses: true } },
    },
  }) satisfies Prisma.PackagingCreateArgs;
