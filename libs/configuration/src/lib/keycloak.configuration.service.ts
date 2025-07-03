/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  KeycloakConnectOptions,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';

@Injectable()
export class KeycloakConfigurationService {
  logger = new Logger(KeycloakConfigurationService.name);
  constructor(private readonly configService: ConfigurationService) {}

  createKeycloakConnectOptions(): KeycloakConnectOptions {
    return {
      authServerUrl: this.configService.getKeycloakConfig().url,
      realm: this.configService.getKeycloakConfig().realm,
      clientId: this.configService.getKeycloakConfig().clientId,
      secret: this.configService.getKeycloakConfig().secret,
      policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
      tokenValidation: TokenValidation.ONLINE,
    };
  }
}
