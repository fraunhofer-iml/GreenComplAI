/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreateProductGroupProps,
  FindAllProductGroupsProps,
  FindProductGroupByIdProps,
  PaginatedData,
  ProductGroupCreateDto,
  ProductGroupDto,
  ProductGroupEntity,
  ProductGroupEntityList,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlagsService } from '../flags/flags.service';
import { productGroupCreateQuery } from './queries/product-group-create.query';
import { productGroupFindManyQuery } from './queries/product-group-find-many.query';
import { productGroupFindUniqueQuery } from './queries/product-group-find-unique.query';

@Injectable()
export class ProductGroupService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly flagsService: FlagsService
  ) {}

  async create({ dto }: CreateProductGroupProps): Promise<ProductGroupEntity> {
    const evaluationElement = ProductGroupDto.createEmpty();
    dto.flags = dto.flags = this.flagsService.evaluateFlag(
      dto,
      evaluationElement,
      dto.flags
    );
    const productGroup = await this.prismaService.productGroup.create(
      productGroupCreateQuery(dto)
    );
    return await this.prismaService.productGroup.findUnique(
      productGroupFindUniqueQuery(productGroup.id)
    );
  }

  async getAll(): Promise<ProductGroupEntityList[]> {
    return this.prismaService.productGroup.findMany({
      include: {
        products: {
          include: {
            waste: true,
          },
        },
        variants: true,
        wasteFlow: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findAll({
    page,
    size,
    filters,
    sorting,
  }: FindAllProductGroupsProps): Promise<
    PaginatedData<ProductGroupEntityList>
  > {
    const skip: number = ((page || 1) - 1) * (size || 10);
    const where = await this.getWhereCondition(filters);

    const retVal = await this.prismaService.productGroup.findMany(
      productGroupFindManyQuery({ where, size, skip, sorting })
    );
    const totalCount = await this.prismaService.productGroup.count({
      where: where,
    });

    return {
      data: retVal,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({
    id,
  }: FindProductGroupByIdProps): Promise<ProductGroupEntity | null> {
    return await this.prismaService.productGroup.findUnique(
      productGroupFindUniqueQuery(id)
    );
  }

  async update(
    id: string,
    dto: ProductGroupCreateDto
  ): Promise<ProductGroupEntity> {
    await this.prismaService.productGroup.update({
      where: { id: id },
      data: {
        name: dto.name,
        description: dto.description,
        wasteFlow: {
          connectOrCreate: {
            where: {
              name: dto.wasteFlow,
            },
            create: {
              name: dto.wasteFlow,
            },
          },
        },
        variants: {
          deleteMany: { name: { notIn: dto.variants }, productGroupId: id },
          upsert: dto.variants.map((v) => ({
            where: { productGroupId_name: { name: v, productGroupId: id } },
            create: { name: v },
            update: {},
          })),
        },
      },
    });
    return await this.prismaService.productGroup.findUnique(
      productGroupFindUniqueQuery(id)
    );
  }

  private async getWhereCondition(
    filters: string | undefined
  ): Promise<Prisma.ProductGroupWhereInput> {
    if (!filters || filters === '') return;

    const filterAsNumber = Number(filters);
    const orConditions: Prisma.ProductGroupWhereInput[] = [
      { name: { contains: filters, mode: 'insensitive' } },
      { id: { contains: filters, mode: 'insensitive' } },
      { wasteFlow: { name: { contains: filters, mode: 'insensitive' } } },
    ];

    if (!isNaN(filterAsNumber)) {
      const ids = await this.getIdsForAmountOfRelations(filterAsNumber);
      orConditions.push({
        id: { in: ids },
      });
    }

    return {
      OR: orConditions,
    };
  }

  private async getIdsForAmountOfRelations(
    filerNumber: number
  ): Promise<string[]> {
    const t = await this.prismaService.productGroup.findMany({
      select: {
        id: true,
        _count: { select: { products: true } },
      },
    });
    return t
      .filter((item) => item._count.products === filerNumber)
      .map((i) => i.id);
  }
}
