/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Broker } from '@ap2/amqp';
import { Module } from '@nestjs/common';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';

@Module({
  imports: [new Broker().getEntityManagerBroker()],
  controllers: [MappingsController],
  providers: [MappingsService],
})
export class MappingModule {}
