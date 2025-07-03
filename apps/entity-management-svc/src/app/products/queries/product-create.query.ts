/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';
import { createUtilizableAndNonUtilizableWaste } from '../../utils/waste-queries';
import { upsertQuery } from './create-or-update.query';

export const productCreateQuery = (dto: ProductCreateDto) =>
  ({
    data: {
      ...upsertQuery(dto),
      billOfMaterialDescription: dto.billOfMaterialDescription,
      waste: dto.waste
        ? {
            create: {
              recycledWastePercentage: dto.waste.recycledWastePercentage ?? 0,
              radioactiveAmount: dto.waste.radioactiveAmount ?? 0,
              normalWaste: createUtilizableAndNonUtilizableWaste(
                dto.waste.normalWaste
              ),
              hazardousWaste: dto.waste.hazardousWaste
                ? createUtilizableAndNonUtilizableWaste(
                    dto.waste.hazardousWaste
                  )
                : undefined,
            },
          }
        : undefined,
      materials: dto.materials ? materialCreateQuery(dto.materials) : undefined,
      criticalRawMaterials: dto.criticalRawMaterials
        ? materialCreateQuery(dto.criticalRawMaterials)
        : undefined,
      rareEarths: dto.rareEarths
        ? materialCreateQuery(dto.rareEarths)
        : undefined,
      productionHistory: dto.productionHistory
        ? {
            create: dto.productionHistory.map((item) => ({
              amount: item.amount,
              year: item.year,
            })),
          }
        : undefined,
    },
  }) satisfies Prisma.ProductCreateArgs;

export const materialCreateQuery = (
  materials: {
    material: string;
    percentage: number;
  }[]
) => ({
  create: materials
    .filter((mat) => mat?.material && mat?.percentage)
    .map((mat) => ({
      material: {
        connectOrCreate: {
          where: {
            name: mat.material,
          },
          create: {
            name: mat.material,
          },
        },
      },
      percentage: mat.percentage,
    })),
});
