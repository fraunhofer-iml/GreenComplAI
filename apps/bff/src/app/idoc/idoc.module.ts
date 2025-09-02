/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { IdocController } from './idoc.controller';
import { Broker } from '@ap2/amqp';
import { IdocService } from './idoc.service';

@Module({
  imports: [new Broker().getEntityManagerBroker()],
  controllers: [IdocController],
  providers: [IdocService],
})
export class IdocModule {}
