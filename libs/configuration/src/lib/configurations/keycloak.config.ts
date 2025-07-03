/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerAs } from '@nestjs/config';

export const KEYCLOAK_IDENTIFIER = 'keycloak';

export interface KeycloakConfiguration {
  url: string;
  realm: string;
  clientId: string;
  secret: string;
  grantType: string;
}

export default registerAs(KEYCLOAK_IDENTIFIER, () => ({
  url:
    process.env['KEYCLOAK_URL'] ||
    'https://kc.public.apps.blockchain-europe.iml.fraunhofer.de',
  realm: process.env['KEYCLOAK_REALM'] || 'skala',
  clientId: process.env['KEYCLOAK_CLIENT_ID'] || 'ap2-backend',
  secret: process.env['KEYCLOAK_SECRET'] || '',
  grantType: process.env['KEYCLOAK_GRANT_TYPE'] || 'client_credentials',
}));
