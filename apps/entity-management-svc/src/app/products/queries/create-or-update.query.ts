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
  name: dto.name || undefined,
  isSellable: dto.isSellable ?? undefined,
  productId: dto.productId?.toString() || undefined,
  description: dto.description ? dto.description.toString() : undefined,
  category: dto.category || undefined,
  weight: Number(dto.weight) || undefined,
  unit: dto.unit || undefined,
  price: Number(dto.price) || undefined,
  dimensions: dto.dimensions || undefined,
  percentageOfBiologicalMaterials:
    Number(dto.percentageOfBiologicalMaterials) || undefined,
  certificationSystem: dto.certification || undefined,
  cascadePrinciple: dto.cascadePrinciple || undefined,
  durability: Number(dto.durability) || undefined,
  durabilityDifference: Number(dto.durabilityDifference) || undefined,
  reparability: Number(dto.reparability) || undefined,
  circularPrinciple: dto.circularPrinciple || undefined,
  circularPrincipleJustification:
    dto.circularPrincipleJustification || undefined,
  circularPrincipleMeasureable: dto.circularPrincipleMeasureable || undefined,
  circularPrincipleAssumption: dto.circularPrincipleAssumption || undefined,
  digitalProductPassportUrl: dto.digitalProductPassportUrl || undefined,
  taricCode: dto.taricCode || undefined,
  gtin: dto.gtin || undefined,
  supplier: dto.supplier
    ? {
        connectOrCreate: {
          where: { id: dto.supplier ?? 'N/A' },
          create: { id: dto.supplier ?? 'N/A', name: dto.supplier ?? 'N/A' },
        },
      }
    : undefined,
  importerName: dto.importerName || undefined,
  importerEmail: dto.importerEmail || undefined,
  importerPhone: dto.importerPhone || undefined,
  importerAddress: dto.importerAddress || undefined,
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
  productGroup: dto.productGroup
    ? {
        connectOrCreate: {
          where: { id: dto.productGroup },
          create: {
            id: dto.productGroup,
            name: dto.productGroup,
            description: 'N/A',
          },
        },
      }
    : undefined,
  wasteFlow: dto.wasteFlow
    ? {
        connectOrCreate: {
          where: {
            name: dto.wasteFlow ?? 'N/A',
          },
          create: {
            name: dto.wasteFlow ?? 'N/A',
          },
        },
      }
    : undefined,
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
  waterUsed: Number(dto.waterUsed) || undefined,
  productCarbonFootprint: Number(dto.productCarbonFootprint) || undefined,
  flags: dto.flags || undefined,
});
