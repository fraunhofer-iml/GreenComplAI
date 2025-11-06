/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductEntity,
  ProductEntityList,
  ProductOutlierDto,
  UpdateFlagProductProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { productFindUniqueQuery } from './queries/product-find-unique.query';

@Injectable()
export class ProductOutlierService {
  constructor(private readonly prismaService: PrismaService) {}

  async getForOutlierDetection(): Promise<ProductEntityList[]> {
    return this.prismaService.product.findMany({
      where: {
        validated: true,
      },
      include: {
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
        waste: {
          include: {
            wasteMaterials: {
              include: {
                material: true,
              },
            },
          },
        },
        wasteFlow: true,
        productGroup: true,
        rareEarths: { include: { material: true } },
        criticalRawMaterials: { include: { material: true } },
      },
    });
  }

  async findOutliers(): Promise<ProductOutlierDto[]> {
    const outliers = await this.prismaService.product.findMany({
      where: {
        AND: [
          { NOT: { outlier: { equals: null } } },
          { NOT: { outlier: { equals: [] } } },
        ],
      },
      select: {
        id: true,
        name: true,
        productId: true,
        productGroup: { select: { name: true } },
        waste: { select: { recycledWastePercentage: true } },
        outlier: true,
      },
    });

    return outliers.map(
      (o) =>
        ({
          ...o,
          productGroup: o.productGroup.name,
          recycledWastePercentage: o.waste?.recycledWastePercentage ?? 0,
        }) as ProductOutlierDto
    );
  }

  async validateOutlier({
    id,
    dto,
  }: UpdateFlagProductProps): Promise<ProductEntity> {
    const { outlier } = await this.prismaService.product.findUnique({
      where: { id: id },
      select: { outlier: true },
    });

    const filteredOutliers = (outlier ?? []).filter(
      (key) => !dto.flags.includes(key)
    );

    await this.prismaService.product.update({
      where: { id: id },
      data: {
        outlier: filteredOutliers,
        validated: filteredOutliers.length === 0,
      },
    });

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }
}
