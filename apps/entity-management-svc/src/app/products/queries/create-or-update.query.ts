/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCreateDto } from '@ap2/api-interfaces';

export const upsertQuery = (dto: Partial<ProductCreateDto>) => ({
  id: dto.id ? dto.id.toString() : undefined,
  name: dto.name ?? 'N/A',
  isSellable: dto.isSellable ?? false,
  productId: dto.productId?.toString() ?? 'N/A',
  description: dto.description ? dto.description.toString() : 'N/A',
  category: dto.category ?? 'N/A',
  weight: Number(dto.weight) || 0,
  unit: dto.unit ?? 'N/A',
  price: Number(dto.price) || 0,
  dimensions: dto.dimensions ?? 'N/A',
  percentageOfBiologicalMaterials:
    Number(dto.percentageOfBiologicalMaterials) || 0,
  certificationSystem: dto.certification ?? 'N/A',
  cascadePrinciple: dto.cascadePrinciple ?? 'N/A',
  durability: Number(dto.durability) || 0,
  durabilityDifference: Number(dto.durabilityDifference) || 0,
  reparability: Number(dto.reparability) || 0,
  circularPrinciple: dto.circularPrinciple ?? false,
  circularPrincipleJustification: dto.circularPrincipleJustification ?? null,
  circularPrincipleMeasureable: dto.circularPrincipleMeasureable ?? false,
  circularPrincipleAssumption: dto.circularPrincipleAssumption ?? null,
  digitalProductPassportUrl: dto.digitalProductPassportUrl ?? null,
  taricCode: dto.taricCode ?? null,
  gtin: dto.gtin ?? null,
  supplier: {
    connectOrCreate: {
      where: { id: dto.supplier ?? 'N/A' },
      create: { id: dto.supplier ?? 'N/A', name: dto.supplier ?? 'N/A' },
    },
  },
  importerName: dto.importerName,
  importerEmail: dto.importerEmail,
  importerPhone: dto.importerPhone,
  importerAddress: dto.importerAddress,
  manufacturer: dto.manufacturer
    ? {
        connect: {
          id: dto.manufacturer,
        },
      }
    : undefined,
  warehouseLocation: dto.warehouseLocation
    ? { connect: { id: dto.warehouseLocation } }
    : undefined,
  productionLocation: dto.productionLocation
    ? { connect: { id: dto.productionLocation } }
    : undefined,
  productGroup: {
    connectOrCreate: {
      where: { id: dto.productGroup ?? 'N/A' },
      create: {
        id: dto.productGroup ?? 'N/A',
        name: dto.productGroup ?? 'N/A',
        description: 'N/A',
      },
    },
  },
  wasteFlow: {
    connectOrCreate: {
      where: {
        name: dto.wasteFlow ?? 'N/A',
      },
      create: {
        name: dto.wasteFlow ?? 'N/A',
      },
    },
  },
  variants: dto.variant
    ? {
        connectOrCreate: {
          where: { id: dto.variant?.toString() },
          create: {
            name: dto.variant?.toString(),
            productGroup: {
              connectOrCreate: {
                where: { id: dto.productGroup ?? 'default' },
                create: {
                  name: dto.productGroup ?? 'default',
                  id: dto.productGroup ?? 'default',
                  description: 'N/A',
                },
              },
            },
          },
        },
      }
    : undefined,
  waterUsed: Number(dto.waterUsed) || 0,
  flags: dto.flags,
});
