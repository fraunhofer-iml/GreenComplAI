/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule } from '@ap2/database';
import { Module } from '@nestjs/common';
import { FlagsModule } from '../flags/flags.module';
import { ProductGroupController } from './product-group.controller';
import { ProductGroupService } from './product-group.service';

@Module({
  imports: [ConfigurationModule, DatabaseModule, FlagsModule],
  controllers: [ProductGroupController],
  providers: [ProductGroupService],
  exports: [ProductGroupService],
})
export class ProductGroupModule {}
