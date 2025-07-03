/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, MappingPatterns } from '@ap2/amqp';
import { CreateMappingProps, MappingDto } from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MappingsService {
  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  async createMapping(props: CreateMappingProps): Promise<MappingDto> {
    return firstValueFrom(
      this.entityManagementService.send<MappingDto>(
        MappingPatterns.CREATE,
        props
      )
    );
  }

  findOne(props: { id: string }): Promise<MappingDto> {
    return firstValueFrom(
      this.entityManagementService.send<MappingDto>(
        MappingPatterns.READ_BY_ID,
        props
      )
    );
  }
}
