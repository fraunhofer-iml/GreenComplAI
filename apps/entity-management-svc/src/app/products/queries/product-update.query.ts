/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductUpdateDto, WasteCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';
import { createUtilizableAndNonUtilizableWaste } from '../../utils/waste-queries';
import { upsertQuery } from './create-or-update.query';

export const productUpdateQuery = (dto: ProductUpdateDto, id: string) =>
  ({
    where: { id: id },
    data: {
      ...upsertQuery(dto.masterData),
      materials: dto.materials
        ? materialUpdateQuery(dto.materials, id)
        : undefined,
      criticalRawMaterials: dto.criticalRawMaterials
        ? minimalMaterialUpdateQuery(dto.criticalRawMaterials, id)
        : undefined,
      rareEarths: dto.rareEarths
        ? minimalMaterialUpdateQuery(dto.rareEarths, id)
        : undefined,
    },
  }) satisfies Prisma.ProductUpdateArgs;

export const materialUpdateQuery = (
  materials: {
    material: string;
    percentage: number;
    renewable?: boolean;
    primary?: boolean;
  }[],
  id: string
) => ({
  upsert: materials
    .filter((mat) => mat?.material && mat?.percentage)
    .map((mat) => ({
      where: {
        productId_materialName: { productId: id, materialName: mat.material },
      },
      create: {
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
        renewable: mat.renewable,
        primary: mat.primary,
      },
      update: {
        percentage: mat.percentage,
        renewable: mat.renewable,
        primary: mat.primary,
      },
    })),
});

export const minimalMaterialUpdateQuery = (
  materials: {
    material: string;
    percentage: number;
  }[],
  id: string
) => ({
  upsert: materials
    .filter((mat) => mat?.material && mat?.percentage)
    .map((mat) => ({
      where: {
        productId_materialName: { productId: id, materialName: mat.material },
      },
      create: {
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
      },
      update: {
        percentage: mat.percentage,
      },
    })),
});

export const productWasteUpdateQuery = (
  productId: string,
  dto: WasteCreateDto,
  wasteId: string
) => ({
  where: { id: productId },
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

export const wasteMaterialUpdateQuery = (
  materials: {
    material: string;
    percentage: number;
  }[],
  id: string
) => ({
  upsert: materials
    .filter((mat) => mat?.material && mat?.percentage)
    .map((mat) => ({
      where: {
        wasteId_materialName: { wasteId: id, materialName: mat.material },
      },
      update: {
        percentage: mat.percentage,
      },
      create: {
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
      },
    })),
});

export const historyUpdateQuery = (
  history: [number, number][],
  productId: string
) => ({
  upsert: history
    .filter((item) => item[0] && item[1])
    .map((item) => ({
      where: {
        productId_year: { year: item[0], productId: productId },
      },
      create: {
        amount: item[1],
        year: item[0],
      },
      update: {
        amount: item[1],
      },
    })),
  deleteMany: {
    year: { notIn: history.map((item) => item[0]) },
  },
});

export const preliminaryConnectionUpdateQuery = (
  preliminaryProducts: [string, number][],
  productId: string,
  description: string
) => ({
  where: { id: productId },
  data: {
    billOfMaterialDescription: description,
    billOfMaterial: {
      upsert: preliminaryProducts.map((preliminaryProduct) => ({
        where: {
          productId_preliminaryProductId: {
            productId: productId,
            preliminaryProductId: preliminaryProduct[0],
          },
        },
        create: {
          amount: preliminaryProduct[1],
          preliminaryProduct: { connect: { id: preliminaryProduct[0] } },
        },
        update: {
          amount: preliminaryProduct[1],
        },
      })),
    },
  },
});

export const packagingConnectionUpdateQuery = (
  packaging: [string, number][],
  productId: string
) => ({
  where: { id: productId },
  data: {
    packagings: {
      upsert: packaging.map((packaging) => ({
        where: {
          productId_packagingId: {
            productId: productId,
            packagingId: packaging[0],
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
