/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, MappingPatterns } from '@ap2/amqp';
import {
  CreateMappingProps,
  MappingDto,
  MappingEntity,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { toMappingDto } from './mapping.mapper';

@Injectable()
export class MappingsService {
  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  async createMapping(props: CreateMappingProps): Promise<MappingDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<MappingEntity>(
        MappingPatterns.CREATE,
        props
      )
    );
    return toMappingDto(entity);
  }

  async findOne(props: { id: string }): Promise<MappingDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<MappingEntity | null>(
        MappingPatterns.READ_BY_ID,
        props
      )
    );
    return toMappingDto(entity);
  }
}
