/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreatePackagingProps,
  FindAllPackagingProps,
  PackagingCreateDto,
  PackagingDto,
  PackagingIdProps,
  PaginatedData,
  UpdatePackagingProps,
  UpdatePackagingWasteProps,
  UpdatePartPackagingProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlagsService } from '../flags/flags.service';
import { createUtilizableAndNonUtilizableWaste } from '../utils/waste-queries';
import { getTotalWeightOfWaste } from '../utils/weight.utils';
import { WasteService } from '../waste/waste.service';
import { packagingCreateQuery } from './queries/packaging-create.query';
import { packagingFindManyQuery } from './queries/packaging-find-many.query';
import { packagingFindUniqueQuery } from './queries/packaging-find-unique.query';
import { packagingWasteUpdateQuery } from './queries/packaging-update.query';

@Injectable()
export class PackagingService {
  private readonly logger: Logger = new Logger(PackagingService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly wasteService: WasteService,
    private readonly flagService: FlagsService
  ) {}

  async create({ dto }: CreatePackagingProps): Promise<PackagingDto> {
    dto.flags = this.flagService.evaluateFlag(
      dto,
      new PackagingCreateDto(0, '', 0, 0, 0, '', '', [], []),
      dto.flags
    );

    const packaging: PackagingDto = await this.prismaService.packaging.create(
      packagingCreateQuery(dto)
    );
    if (packaging.waste)
      await this.wasteService.createWasteAmountConnection(
        packaging.waste.id,
        dto.waste
      );
    if (dto.partPackagings)
      await this.createPartPackagingConnection(
        packaging.id,
        dto.partPackagings
      );
    return packaging;
  }

  async findAll({
    page,
    size,
    filters,
    sorting,
  }: FindAllPackagingProps): Promise<PaginatedData<PackagingDto>> {
    const skip: number = ((page || 1) - 1) * (size || 10);
    const where = this.getWhereCondition(filters);

    const packagings = await this.prismaService.packaging.findMany(
      packagingFindManyQuery(where, skip, size, sorting)
    );

    const retVal: PackagingDto[] = [];
    packagings.forEach((packaging) => {
      const p: PackagingDto = {
        ...packaging,
        supplierName: packaging.supplier.name,
      };
      retVal.push(p);
    });
    const totalCount = await this.prismaService.packaging.count({
      where: where,
    });

    return {
      data: retVal,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: PackagingIdProps): Promise<PackagingDto> {
    const packaging = await this.prismaService.packaging.findUnique(
      packagingFindUniqueQuery(id)
    );
    const totalWasteWeight = getTotalWeightOfWaste(packaging.waste);
    return {
      ...packaging,
      waste: packaging.waste
        ? {
            ...packaging.waste,
            wasteMaterials: packaging.waste
              ? packaging.waste.wasteMaterials.map((mat) => ({
                  ...mat,
                  weightInKg: mat.percentage * totalWasteWeight,
                }))
              : [],
          }
        : undefined,
      products: [],
    };
  }

  async update({ id, dto }: UpdatePackagingProps): Promise<PackagingDto> {
    return this.prismaService.packaging.update({
      where: {
        id: id,
      },
      data: {
        weight: dto.weight,
        name: dto.name,
        percentageOfRenewableMaterial: dto.percentageOfRenewableMaterial,
        percentageOfRecycledMaterial: dto.percentageOfRecycledMaterial,
        percentageOfRStrategies: dto.percentageOfRStrategies,
        supplier: {
          connectOrCreate: {
            where: { id: dto.supplierId },
            create: {
              id: dto.supplierId,
              name: dto.supplierId,
            },
          },
        },
        material: {
          connectOrCreate: {
            where: { name: dto.materialId },
            create: { name: dto.materialId },
          },
        },
      },
      include: { material: true, supplier: { include: { addresses: true } } },
    });
  }

  async updatePartPackaging({
    id,
    dto,
  }: UpdatePartPackagingProps): Promise<void> {
    await this.prismaService.packagingPartPackaging.deleteMany({
      where: {
        packagingId: id,
        partPackagingId: {
          notIn: dto.map.map((dto) => dto[0] ?? ''),
        },
      },
    });

    const queries = [];

    dto.map.forEach((p) => {
      const q = this.prismaService.packagingPartPackaging.upsert({
        where: {
          partPackagingId_packagingId: {
            partPackagingId: p[0],
            packagingId: id,
          },
        },
        create: {
          partPackaging: { connect: { id: p[0] } },
          amount: p[1],
          packaging: { connect: { id: id } },
        },
        update: {
          amount: p[1],
        },
      });

      queries.push(q);
    });

    await Promise.all(queries);
  }

  async updateWaste({ id, dto }: UpdatePackagingWasteProps): Promise<void> {
    const { wasteId } = await this.prismaService.packaging.findFirst({
      select: { wasteId: true },
      where: { id: id },
    });

    if (!wasteId) {
      const packaging = await this.prismaService.packaging.update({
        where: { id: id },
        data: {
          waste: {
            create: {
              recycledWastePercentage: Number(dto.recycledWastePercentage) || 0,
              radioactiveAmount: Number(dto.radioactiveAmount) || 0,
              normalWaste: dto.normalWaste
                ? createUtilizableAndNonUtilizableWaste(dto.normalWaste)
                : undefined,
              hazardousWaste: dto.hazardousWaste
                ? createUtilizableAndNonUtilizableWaste(dto.hazardousWaste)
                : undefined,
            },
          },
        },
      });

      const queries = [];

      dto.wasteMaterials.forEach((material) => {
        const q = this.prismaService.wasteMaterial.create({
          data: {
            waste: {
              connect: {
                id: packaging.wasteId,
              },
            },
            material: {
              connectOrCreate: {
                where: { name: material.material },
                create: { name: material.material },
              },
            },
            percentage: material.percentage,
          },
        });
        queries.push(q);
      });
      await Promise.all(queries);
    } else {
      await this.prismaService.wasteMaterial.deleteMany({
        where: {
          wasteId: wasteId,
          materialName: { notIn: dto.wasteMaterials.map((m) => m.material) },
        },
      });

      await this.prismaService.packaging.update(
        packagingWasteUpdateQuery(id, dto, wasteId)
      );
    }
  }

  async remove({ id }: PackagingIdProps): Promise<void> {
    await this.prismaService.packaging.delete({
      where: {
        id: id,
      },
    });
  }

  async findPartPackagings({
    id,
  }: PackagingIdProps): Promise<[PackagingDto, number][]> {
    const products = await this.prismaService.packagingPartPackaging.findMany({
      where: { packagingId: id },
      include: {
        partPackaging: {
          include: {
            supplier: { include: { addresses: true } },
            waste: {
              include: { wasteMaterials: { include: { material: true } } },
            },
            material: true,
          },
        },
      },
    });

    return products.map((p) => [p.partPackaging, p.amount] as const);
  }

  private getWhereCondition(
    filter: string | undefined
  ): Prisma.PackagingWhereInput {
    if (!filter) return {};

    const where: Prisma.PackagingWhereInput = {
      OR: [
        { id: { contains: filter } },
        { name: { contains: filter } },
        { supplierId: { contains: filter } },
        { materialId: { contains: filter } },
      ],
    };

    const filterAsNumber = Number(filter);
    if (!Number.isNaN(filterAsNumber)) {
      const whereNumber: Prisma.PackagingWhereInput[] = [
        { percentageOfRStrategies: filterAsNumber },
        { percentageOfRenewableMaterial: filterAsNumber },
        { weight: filterAsNumber },
      ];
      where.OR = [...where.OR, ...whereNumber];
    }

    return where;
  }

  private async createPartPackagingConnection(
    packagingId: string,
    packagings: [string, number][]
  ): Promise<void> {
    await this.prismaService.packagingPartPackaging.createMany({
      data: packagings.map(([partPackagingId, amount]) => ({
        amount,
        partPackagingId,
        packagingId,
      })),
    });
  }
}
