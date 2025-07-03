/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteCreateDto, WasteMaterialDto } from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WasteService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findWasteMaterial(wasteId: string): Promise<WasteMaterialDto[]> {
    return this.prismaService.wasteMaterial.findMany({
      where: { wasteId: wasteId },
      include: {
        material: true,
      },
    });
  }

  public async createWasteAmountConnection(
    wasteId: string,
    wasteMaterialDtos: Partial<WasteCreateDto>
  ): Promise<void> {
    if (!wasteMaterialDtos.wasteMaterials) return;
    for (const material of wasteMaterialDtos.wasteMaterials) {
      if (material) {
        await this.prismaService.wasteMaterial.create({
          data: {
            waste: {
              connect: {
                id: wasteId,
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
      }
    }
  }
}
