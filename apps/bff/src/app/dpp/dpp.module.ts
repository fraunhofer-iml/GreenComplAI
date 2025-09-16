/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Broker } from '@ap2/amqp';
import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { DppController } from './dpp.controller';
import { DppService } from './dpp.service';

@Module({
  imports: [new Broker().getDppBroker(), ProductsModule],
  controllers: [DppController],
  providers: [DppService],
})
export class DppModule {}
