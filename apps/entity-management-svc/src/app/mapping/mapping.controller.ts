/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappingPatterns } from '@ap2/amqp';
import { CreateMappingProps, MappingEntity } from '@ap2/api-interfaces';
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MappingService } from './mapping.service';

@Controller()
export class MappingController {
  private readonly logger: Logger = new Logger(MappingController.name);

  constructor(private readonly mappingService: MappingService) {}

  @MessagePattern(MappingPatterns.CREATE) async createMapping(
    @Payload() payload: CreateMappingProps
  ): Promise<MappingEntity> {
    return await this.mappingService.createMapping(payload.dto);
  }

  @MessagePattern(MappingPatterns.READ_BY_ID)
  async findOne(
    @Payload() payload: { id: string }
  ): Promise<MappingEntity | null> {
    return await this.mappingService.findOne(payload.id);
  }
}
