/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FindAllProductsOfSupplierProps,
  FindProductOfSupplierByIdProps,
  PaginatedData,
  ProductEntity,
  ProductEntityList,
  UpdateProductOfSupplierProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { getWhereCondition } from './product-utils';
import { productFindUniqueQuery } from './queries/product-find-unique.query';
import {
  productFindManyOfSupplierQuery,
  productFindUniqueOfSupplierQuery,
  updateProductOfSupplier,
} from './queries/supplier.query';

@Injectable()
export class ProductSupplierService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll({
    filters,
    page,
    size,
    sorting,
    isSellable,
    supplierCompanyId,
  }: FindAllProductsOfSupplierProps): Promise<
    PaginatedData<ProductEntityList>
  > {
    const skip: number = (page - 1) * size;

    const f = getWhereCondition(filters, isSellable);

    const products = await this.prismaService.product.findMany(
      productFindManyOfSupplierQuery({
        filters: f ? f : undefined,
        size,
        skip,
        sorting,
        supplierId: supplierCompanyId,
      })
    );

    const totalCount = await this.prismaService.product.count({
      where: {
        ...(f || {}),
        supplierId: supplierCompanyId,
      },
    });

    return {
      data: products,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({
    id,
    supplierCompanyId,
  }: FindProductOfSupplierByIdProps): Promise<ProductEntityList | null> {
    return await this.prismaService.product.findUnique(
      productFindUniqueOfSupplierQuery(id, supplierCompanyId)
    );
  }

  async update({
    dto,
    id,
    supplierCompanyId,
  }: UpdateProductOfSupplierProps): Promise<ProductEntity> {
    const productExists = await this.findOne({ id, supplierCompanyId });

    if (!productExists) {
      throw new Error(
        `Product with ID ${id} not found for supplier ${supplierCompanyId}`
      );
    }

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

    await this.prismaService.product.update({
      where: {
        id,
      },
      ...updateProductOfSupplier(dto, id),
    });

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }
}
