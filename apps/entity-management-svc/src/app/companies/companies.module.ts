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
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    FlagsModule,
    UserManagementModule,
  ],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    {
      provide: USER_MANAGEMENT_SERVICE_TOKEN,
      useClass: KeycloakUserManagementAdapter,
    },
  ],
})
export class CompaniesModule {}
