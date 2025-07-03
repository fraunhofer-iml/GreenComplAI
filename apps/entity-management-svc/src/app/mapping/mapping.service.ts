/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappingDto } from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MappingService {
  constructor(private readonly prismaService: PrismaService) {}

  async createMapping(dto: MappingDto): Promise<MappingDto> {
    const existingMapping = await this.prismaService.mapping.findUnique({
      where: { key: dto.key },
    });

    if (existingMapping) {
      return this.prismaService.mapping.update({
        where: { key: dto.key },
        data: {
          mappingElements: {
            deleteMany: {},
            createMany: { data: dto.mappingElements },
          },
        },
        select: {
          key: true,
          mappingElements: {
            select: {
              key: true,
              value: true,
            },
          },
        },
      });
    }

    return this.prismaService.mapping.create({
      data: {
        key: dto.key,
        mappingElements: {
          createMany: { data: dto.mappingElements },
        },
      },
      select: {
        key: true,
        mappingElements: {
          select: {
            key: true,
            value: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<MappingDto> {
    return this.prismaService.mapping.findFirst({
      where: {
        OR: [{ id: id }, { key: id }],
      },
      select: {
        key: true,
        mappingElements: {
          select: {
            key: true,
            value: true,
          },
        },
      },
    });
  }
}
