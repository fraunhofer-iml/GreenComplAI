/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GENERAL_CONFIG_IDENTIFIER,
  GeneralConfiguration,
} from './configurations/general.config';
import {
  KEYCLOAK_IDENTIFIER,
  KeycloakConfiguration,
} from './configurations/keycloak.config';

@Injectable()
export class ConfigurationService {
  logger = new Logger(ConfigurationService.name);
  constructor(private readonly configService: ConfigService) {}

  public getKeycloakConfig(): KeycloakConfiguration {
    const keycloakConfig =
      this.configService.get<KeycloakConfiguration>(KEYCLOAK_IDENTIFIER);
    if (!keycloakConfig) {
      const msg = 'Environment variables for keycloak configuration missing!';
      this.logger.error(msg);
      throw new Error(msg);
    }
    return keycloakConfig;
  }

  public getGeneralConfig(): GeneralConfiguration {
    const generalConfig = this.configService.get<GeneralConfiguration>(
      GENERAL_CONFIG_IDENTIFIER
    );
    if (!generalConfig) {
      const msg = 'Environment variables for configuration missing!';
      this.logger.error(msg);
      throw new Error(msg);
    }
    return generalConfig;
  }
}
