/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappingDto, MappingEntity } from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MappingService {
  constructor(private readonly prismaService: PrismaService) {}

  async createMapping(dto: MappingDto): Promise<MappingEntity> {
    const existingMapping = await this.prismaService.gCMapping.findUnique({
      where: { key: dto.key },
    });

    if (existingMapping) {
      return this.prismaService.gCMapping.update({
        where: { key: dto.key },
        data: {
          mappingElements: {
            deleteMany: {},
            createMany: { data: dto.mappingElements },
          },
        },
        include: {
          mappingElements: true,
        },
      });
    }

    return this.prismaService.gCMapping.create({
      data: {
        key: dto.key,
        mappingElements: {
          createMany: { data: dto.mappingElements },
        },
      },
      include: {
        mappingElements: true,
      },
    });
  }

  async findOne(id: string): Promise<MappingEntity | null> {
    return this.prismaService.gCMapping.findFirst({
      where: {
        OR: [{ id: id }, { key: id }],
      },
      include: {
        mappingElements: true,
      },
    });
  }
}
