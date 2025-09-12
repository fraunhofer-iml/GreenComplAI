/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule } from '@ap2/database';
import {
  KeycloakUserManagementAdapter,
  USER_MANAGEMENT_SERVICE_TOKEN,
  UserManagementModule,
} from '@greencomplai/user-management';
import { Module } from '@nestjs/common';
import { FlagsModule } from '../flags/flags.module';
import { IdocController } from './idoc.controller';
import { IdocService } from './idoc.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    FlagsModule,
    UserManagementModule,
    ProductsModule,
  ],
  controllers: [IdocController],
  providers: [
    IdocService,
    {
      provide: USER_MANAGEMENT_SERVICE_TOKEN,
      useClass: KeycloakUserManagementAdapter,
    },
  ],
})
export class IdocModule {}
