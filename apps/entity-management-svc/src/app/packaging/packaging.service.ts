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
  MaterialDto,
  PackagingCreateDto,
  PackagingEntity,
  PackagingEntityList,
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

  async create({ dto }: CreatePackagingProps): Promise<PackagingEntity> {
    dto.flags = this.flagService.evaluateFlag(
      dto,
      new PackagingCreateDto(0, '', 0, 0, 0, '', '', [], []),
      dto.flags
    );

    const packaging = await this.prismaService.packaging.create(
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
    if (dto.materials)
      await this.createPackagingMaterialsConnection(
        packaging.id,
        dto.materials
      );

    return await this.prismaService.packaging.findUnique(
      packagingFindUniqueQuery(packaging.id)
    );
  }

  async findAll({
    page,
    size,
    filters,
    sorting,
  }: FindAllPackagingProps): Promise<PaginatedData<PackagingEntityList>> {
    const skip: number = ((page || 1) - 1) * (size || 10);
    const where = this.getWhereCondition(filters);

    const packagings = await this.prismaService.packaging.findMany(
      packagingFindManyQuery(where, skip, size, sorting)
    );

    const totalCount = await this.prismaService.packaging.count({
      where: where,
    });

    return {
      data: packagings,
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: PackagingIdProps): Promise<PackagingEntity | null> {
    return await this.prismaService.packaging.findUnique(
      packagingFindUniqueQuery(id)
    );
  }

  async update({ id, dto }: UpdatePackagingProps): Promise<PackagingEntity> {
    await this.prismaService.packaging.update({
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
      },
    });

    if (dto.materials) {
      await this.updatePackagingMaterials(id, dto.materials);
    }

    return await this.prismaService.packaging.findUnique(
      packagingFindUniqueQuery(id)
    );
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
  }: PackagingIdProps): Promise<[PackagingEntity, number][]> {
    const products = await this.prismaService.packagingPartPackaging.findMany({
      where: { packagingId: id },
      include: {
        partPackaging: {
          include: {
            products: { include: { product: true } },
            supplier: { include: { addresses: true } },
            waste: {
              include: {
                hazardousWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                normalWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                wasteMaterials: { include: { material: true } },
              },
            },
            materials: { include: { material: true } },
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
        { id: { contains: filter, mode: 'insensitive' } },
        { name: { contains: filter, mode: 'insensitive' } },
        { supplierId: { contains: filter, mode: 'insensitive' } },
        { supplier: { name: { contains: filter, mode: 'insensitive' } } },
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

  private async createPackagingMaterialsConnection(
    packagingId: string,
    materials: {
      material: string;
      percentage: number;
      renewable?: boolean;
      primary?: boolean;
    }[]
  ): Promise<void> {
    // First ensure all materials exist in the Material table
    for (const mat of materials) {
      if (mat?.material && mat?.percentage) {
        // Check if material exists, if not create it
        const existingMaterial = await this.prismaService.material.findUnique({
          where: { name: mat.material },
        });

        if (!existingMaterial) {
          await this.prismaService.material.create({
            data: {
              name: mat.material,
            },
          });
        }
      }
    }

    const materialData = materials
      .filter((mat) => mat?.material && mat?.percentage)
      .map((mat) => ({
        packagingId,
        materialName: mat.material,
        percentage: mat.percentage,
        renewable: mat.renewable,
        primary: mat.primary,
      }));

    if (materialData.length > 0) {
      await this.prismaService.packagingMaterials.createMany({
        data: materialData,
      });
    }
  }

  private async updatePackagingMaterials(
    packagingId: string,
    materials: {
      material: string;
      percentage: number;
      renewable?: boolean;
      primary?: boolean;
    }[]
  ): Promise<void> {
    // Delete existing materials
    await this.prismaService.packagingMaterials.deleteMany({
      where: { packagingId },
    });

    // Create new materials
    await this.createPackagingMaterialsConnection(packagingId, materials);
  }

  static transformMaterialsToDto(
    materials: {
      material: MaterialDto;
      percentage: number;
      renewable?: boolean;
      primary?: boolean;
    }[]
  ): [MaterialDto, number, boolean?, boolean?][] {
    return materials.map((mat) => [
      mat.material,
      mat.percentage,
      mat.renewable ?? false,
      mat.primary ?? false,
    ]);
  }
}
