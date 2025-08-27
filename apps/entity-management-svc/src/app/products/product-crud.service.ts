/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreateProductProps,
  DeleteProductProps,
  FindAllProductsProps,
  FindProductByIdProps,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  SearchProductsProps,
  UpdateProductProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlagsService } from '../flags/flags.service';
import { getTotalWeightOfWaste } from '../utils/weight.utils';
import { WasteService } from '../waste/waste.service';
import { ProductRelationsService } from './product-relations.service';
import { getWhereCondition } from './product-utils';
import { productCreateQuery } from './queries/product-create.query';
import { productFindManyQuery } from './queries/product-find-many.query';
import { productFindUniqueQuery } from './queries/product-find-unique.query';
import { productUpdateQuery } from './queries/product-update.query';

@Injectable()
export class ProductCrudService {
  private readonly logger: Logger = new Logger(ProductCrudService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly wasteService: WasteService,
    private readonly flagService: FlagsService,
    private readonly relationsService: ProductRelationsService
  ) {}

  async create({
    dto,
    outlierDetectionResult,
  }: CreateProductProps): Promise<ProductDto> {
    dto.flags = this.flagService.evaluateFlag(
      dto,
      new ProductCreateDto('', []),
      dto.flags
    );

    const product = await this.prismaService.product.create(
      productCreateQuery(dto, outlierDetectionResult)
    );

    if (dto.billOfMaterial)
      await this.relationsService.createPreliminaryProductConnection({
        preliminaryProducts: dto.billOfMaterial,
        productId: product.id,
      });

    if (dto.waste)
      await this.wasteService.createWasteAmountConnection(
        product.wasteId,
        dto.waste
      );

    if (dto.packagings)
      await this.relationsService.createPackagingConnection({
        packaging: dto.packagings,
        productId: product.id,
      });

    return {
      ...product,
    };
  }

  async findAll({
    filters,
    page,
    size,
    sorting,
    isSellable,
  }: FindAllProductsProps): Promise<PaginatedData<ProductDto>> {
    const skip: number = (page - 1) * size;
    const f = getWhereCondition(filters, isSellable);

    const products = await this.prismaService.product.findMany(
      productFindManyQuery({
        filters: f ? f : undefined,
        size,
        skip,
        sorting,
      })
    );

    const totalCount = await this.prismaService.product.count({
      where: f,
    });

    return {
      data: products.map((p) => ({
        ...p,
        materials: p.materials.map((m) => [m.material, m.percentage] as const),
        wasteFlow: p.wasteFlow?.name,

        rareEarths: p.rareEarths.map(
          (m) => [m.material, m.percentage] as const
        ),
        criticalRawMaterials: p.criticalRawMaterials.map(
          (m) => [m.material, m.percentage] as const
        ),
      })),
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: FindProductByIdProps): Promise<ProductDto> {
    const product = await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
    const packagings = await this.relationsService.getProductPackagings(id);
    const totalWeight = getTotalWeightOfWaste(product.waste);

    return {
      ...product,
      packagings,
      materials: product.materials.map(
        (m) => [m.material, m.percentage] as const
      ),
      wasteFlow: product.wasteFlow?.name ? product.wasteFlow.name : 'N/A',
      rareEarths: product.rareEarths.map(
        (m) => [m.material, m.percentage] as const
      ),
      criticalRawMaterials: product.criticalRawMaterials.map(
        (m) => [m.material, m.percentage] as const
      ),
      waste: {
        ...product.waste,
        wasteMaterials: product.waste
          ? product.waste.wasteMaterials.map((mat) => ({
              ...mat,
              weightInKg: mat.percentage * totalWeight,
            }))
          : [],
      },
    };
  }

  async update({ dto, id }: UpdateProductProps): Promise<ProductDto> {
    await this.prismaService.productMaterials.deleteMany({
      where: {
        productId: id,
        materialName: { notIn: dto.materials.map((m) => m.material) },
      },
    });

    await this.prismaService.rareEarths.deleteMany({
      where: {
        productId: id,
        materialName: { notIn: dto.rareEarths.map((m) => m.material) },
      },
    });

    await this.prismaService.criticalRawMaterials.deleteMany({
      where: {
        productId: id,
        materialName: {
          notIn: dto.criticalRawMaterials.map((m) => m.material),
        },
      },
    });

    const product = await this.prismaService.product.update({
      where: {
        id,
      },
      ...productUpdateQuery(dto, id),
    });

    return {
      ...product,
      outlier: (product.outlier as Prisma.JsonArray).map(
        (o: { key: string; value: number }) => o.key
      ),
    };
  }

  async delete({ id }: DeleteProductProps): Promise<ProductDto> {
    const p = await this.prismaService.product.delete({
      where: {
        id,
      },
    });
    return {
      ...p,
      outlier: (p.outlier as Prisma.JsonArray).map(
        (o: { key: string; value: number }) => o.key
      ),
    };
  }

  async search({ value }: SearchProductsProps): Promise<ProductDto[]> {
    if (value === '') return [];

    const whereCondition = {
      OR: [
        { name: { contains: value } },
        { productGroup: { name: { contains: value } } },
        { manufacturer: { name: { contains: value } } },
        { supplier: { name: { contains: value } } },
        { importer: { name: { contains: value } } },
        { category: { contains: value } },
        { productId: { contains: value } },
      ],
    };
    const result = await this.prismaService.product.findMany({
      where: whereCondition,
      include: {
        supplier: { include: { addresses: true } },
        importer: { include: { addresses: true } },
        manufacturer: { include: { addresses: true } },
        productGroup: true,
        rareEarths: { include: { material: true } },
        criticalRawMaterials: { include: { material: true } },
      },
    });
    return result.map((p) => ({
      ...p,
      rareEarths: p.rareEarths.map((m) => [m.material, m.percentage] as const),
      criticalRawMaterials: p.criticalRawMaterials.map(
        (m) => [m.material, m.percentage] as const
      ),
      outlier: ((p.outlier as Prisma.JsonArray) ?? []).map(
        (o: { key: string; value: number }) => o.key
      ),
    }));
  }
}
