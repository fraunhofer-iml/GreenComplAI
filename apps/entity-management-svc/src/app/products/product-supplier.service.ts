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
  ProductDto,
  UpdateProductOfSupplierProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { getWhereCondition } from './product-utils';
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
    PaginatedData<Partial<ProductDto>>
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

  async findOne({
    id,
    supplierCompanyId,
  }: FindProductOfSupplierByIdProps): Promise<Partial<ProductDto>> {
    const product = await this.prismaService.product.findUnique(
      productFindUniqueOfSupplierQuery(id, supplierCompanyId)
    );

    return {
      ...product,
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
    };
  }

  async update({
    dto,
    id,
    supplierCompanyId,
  }: UpdateProductOfSupplierProps): Promise<ProductDto> {
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

    const product = await this.prismaService.product.update({
      where: {
        id,
      },
      ...updateProductOfSupplier(dto, id),
    });

    return product;
  }
}
