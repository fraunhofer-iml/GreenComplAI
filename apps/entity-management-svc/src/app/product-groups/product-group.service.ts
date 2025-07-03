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
  WasteMaterialEvaluationDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { FlagsService } from '../flags/flags.service';
import { getTotalWeightOfWaste } from '../utils/weight.utils';
import { productGroupCreateQuery } from './queries/product-group-create.query';
import { productGroupFindManyQuery } from './queries/product-group-find-many.query';
import { productGroupFindUniqueQuery } from './queries/product-group-find-unique.query';

@Injectable()
export class ProductGroupService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly flagsService: FlagsService
  ) {}

  async create({ dto }: CreateProductGroupProps): Promise<ProductGroupDto> {
    const evaluationElement = ProductGroupDto.createEmpty();
    dto.flags = dto.flags = this.flagsService.evaluateFlag(
      dto,
      evaluationElement,
      dto.flags
    );
    return this.prismaService.productGroup.create(productGroupCreateQuery(dto));
  }

  async getAll(): Promise<ProductGroupDto[]> {
    return this.prismaService.productGroup.findMany({
      include: {
        products: {
          include: {
            waste: true,
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
  }: FindAllProductGroupsProps): Promise<PaginatedData<ProductGroupDto>> {
    const skip: number = ((page || 1) - 1) * (size || 10);
    const where =
      filters && filters !== ''
        ? {
            OR: [
              { name: { contains: filters } },
              { id: { contains: filters } },
            ],
          }
        : undefined;

    const retVal = await this.prismaService.productGroup.findMany(
      productGroupFindManyQuery({ where, size, skip, sorting })
    );
    const totalCount = await this.prismaService.productGroup.count({
      where: { name: { contains: filters } },
    });

    return {
      data: retVal.map(
        (group) =>
          ({
            id: group.id,
            name: group.name,
            description: group.description,
            amount: group._count.products,
            wasteFlow: group.wasteFlow?.name,
            variants: group.variants,
            products: group.products,
            flags: group.flags,
          }) as ProductGroupDto
      ),
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: FindProductGroupByIdProps): Promise<ProductGroupDto> {
    const res = await this.prismaService.productGroup.findUnique(
      productGroupFindUniqueQuery(id)
    );

    const wasteMaterialEvaluation: WasteMaterialEvaluationDto[] = [];

    res.products.forEach((product) => {
      if (product.waste) {
        const wasteWeight = getTotalWeightOfWaste(product.waste);
        product.waste.wasteMaterials.forEach((item) => {
          const wasteMaterialWeight = wasteWeight * item.percentage;
          const existingMaterial = wasteMaterialEvaluation.find(
            (x) => x.name === item.material.name
          );
          if (existingMaterial) {
            existingMaterial.weightInKg += wasteMaterialWeight;
          } else {
            wasteMaterialEvaluation.push(
              new WasteMaterialEvaluationDto(
                item.material.name,
                wasteMaterialWeight
              )
            );
          }
        });
      }
    });

    return {
      ...res,
      wasteMaterialEvaluation,
      wasteFlow: res.wasteFlow?.name,
      products: res.products,
    } as ProductGroupDto;
  }

  async update(
    id: string,
    dto: ProductGroupCreateDto
  ): Promise<ProductGroupDto> {
    return this.prismaService.productGroup.update({
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
  }
}
