/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { Module } from '@nestjs/common';
import { KeycloakUserManagementAdapter } from './keycloak/keycloak-user-management.adapter';
import { USER_MANAGEMENT_SERVICE_TOKEN } from './user-management.interface';

@Module({
  providers: [
    {
      provide: USER_MANAGEMENT_SERVICE_TOKEN,
      useClass: KeycloakUserManagementAdapter,
    },
  ],
  exports: [USER_MANAGEMENT_SERVICE_TOKEN],
  imports: [ConfigurationModule],
})
export class UserManagementModule {}
