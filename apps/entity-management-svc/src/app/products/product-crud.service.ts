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
  ProductEntity,
  ProductEntityList,
  SearchProductsProps,
  UpdateProductProps,
} from '@ap2/api-interfaces';
import { AmqpException } from '@ap2/amqp';
import { PrismaService } from '@ap2/database';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FlagsService } from '../flags/flags.service';
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
  }: CreateProductProps): Promise<ProductEntity> {
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

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(product.id)
    );
  }

  async findAll({
    filters,
    page,
    size,
    sorting,
    isSellable,
  }: FindAllProductsProps): Promise<PaginatedData<ProductEntityList>> {
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
      data: products,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: FindProductByIdProps): Promise<ProductEntity | null> {
    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async update({ dto, id }: UpdateProductProps): Promise<ProductEntity> {
    if (dto.materials)
      await this.removeMaterials(
        id,
        dto.materials.map((m) => m.material)
      );

    if (dto.rareEarths)
      await this.removeRareEarths(
        id,
        dto.rareEarths.map((m) => m.material)
      );

    if (dto.criticalRawMaterials)
      await this.removeCriticalRawMaterials(
        id,
        dto.criticalRawMaterials.map((m) => m.material)
      );

    await this.prismaService.product.update({
      where: {
        id,
      },
      ...productUpdateQuery(dto, id),
    });

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async delete({ id }: DeleteProductProps): Promise<ProductEntity> {
    const product = await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
    if (!product) {
      throw new AmqpException('Product not found', HttpStatus.NOT_FOUND);
    }
    await this.prismaService.product.delete({
      where: {
        id,
      },
    });
    return product;
  }

  async search({ value }: SearchProductsProps): Promise<ProductEntityList[]> {
    if (value === '') return [];

    const whereCondition = {
      OR: [
        { name: { contains: value } },
        { productGroup: { name: { contains: value } } },
        { manufacturer: { name: { contains: value } } },
        { supplier: { name: { contains: value } } },
        { category: { contains: value } },
        { productId: { contains: value } },
      ],
    };
    return await this.prismaService.product.findMany({
      where: whereCondition,
      include: {
        supplier: { include: { addresses: true } },
        manufacturer: { include: { addresses: true } },
        productGroup: true,
        rareEarths: { include: { material: true } },
        criticalRawMaterials: { include: { material: true } },
        materials: {
          include: {
            material: true,
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
      },
    });
  }

  private async removeMaterials(productId: string, materials: string[]) {
    await this.prismaService.productMaterials.deleteMany({
      where: {
        productId: productId,
        materialName: { notIn: materials },
      },
    });
  }

  private async removeRareEarths(productId: string, materials: string[]) {
    await this.prismaService.rareEarths.deleteMany({
      where: {
        productId: productId,
        materialName: { notIn: materials },
      },
    });
  }

  private async removeCriticalRawMaterials(
    productId: string,
    materials: string[]
  ) {
    await this.prismaService.criticalRawMaterials.deleteMany({
      where: {
        productId: productId,
        materialName: { notIn: materials },
      },
    });
  }
}
