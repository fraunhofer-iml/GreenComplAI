/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductUpdateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';
import { materialUpdateQuery } from './product-update.query';

export const productFindManyOfSupplierQuery = ({
  filters,
  size,
  skip,
  sorting,
  supplierId,
}: {
  skip: number;
  size: number;
  filters: Prisma.ProductWhereInput;
  sorting: string;
  supplierId: string;
}) =>
  ({
    skip: skip,
    take: size,
    where: { ...filters, supplierId },
    select: {
      rareEarths: { include: { material: true } },
      criticalRawMaterials: { include: { material: true } },
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

      manufacturer: {
        include: {
          addresses: true,
        },
      },
      digitalProductPassportUrl: true,
      wasteFlow: true,
      waterUsed: true,
      productCarbonFootprint: true,
      name: true,
      id: true,
      description: true,
      unit: true,
      dimensions: true,
      cascadePrinciple: true,
      circularPrinciple: true,
      weight: true,
      percentageOfBiologicalMaterials: true,
      certificationSystem: true,
    },
    orderBy: JSON.parse(sorting || '{}'),
  }) satisfies Prisma.ProductFindManyArgs;

export const productFindUniqueOfSupplierQuery = (
  id: string,
  supplierId: string
) =>
  ({
    where: {
      id,
      supplierId,
    },
    select: {
      rareEarths: { include: { material: true } },
      criticalRawMaterials: { include: { material: true } },
      materials: {
        include: {
          material: true,
        },
      },
      manufacturer: {
        include: {
          addresses: true,
        },
      },
      digitalProductPassportUrl: true,
      wasteFlow: true,
      waterUsed: true,
      productCarbonFootprint: true,
      name: true,
      id: true,
      description: true,
      unit: true,
      dimensions: true,
      cascadePrinciple: true,
      circularPrinciple: true,
      weight: true,
      percentageOfBiologicalMaterials: true,
      certificationSystem: true,
    },
  }) satisfies Prisma.ProductFindUniqueArgs;

export const updateProductOfSupplier = (dto: ProductUpdateDto, id: string) =>
  ({
    where: {
      id,
    },
    data: {
      name: dto.masterData.name,
      description: dto.masterData.description,
      manufacturer: {
        connect: { id: dto.masterData.manufacturer },
      },
      importerName: dto.masterData.importerName,
      importerEmail: dto.masterData.importerEmail,
      importerPhone: dto.masterData.importerPhone,
      importerAddress: dto.masterData.importerAddress,
      unit: dto.masterData.unit,
      dimensions: dto.masterData.dimensions,
      weight: dto.masterData.weight,
      percentageOfBiologicalMaterials:
        dto.masterData.percentageOfBiologicalMaterials,
      certificationSystem: dto.masterData.certification,
      circularPrinciple: dto.masterData.circularPrinciple,
      cascadePrinciple: dto.masterData.cascadePrinciple,
      waterUsed: Number(dto.masterData.waterUsed) || 0,
      productCarbonFootprint:
        Number(dto.masterData.productCarbonFootprint) || 0,
      materials: materialUpdateQuery(dto.materials, id),
      criticalRawMaterials: materialUpdateQuery(dto.criticalRawMaterials, id),
      rareEarths: materialUpdateQuery(dto.rareEarths, id),
      digitalProductPassportUrl:
        dto.masterData.digitalProductPassportUrl ?? null,
    },
  }) satisfies Prisma.ProductUpdateArgs;
