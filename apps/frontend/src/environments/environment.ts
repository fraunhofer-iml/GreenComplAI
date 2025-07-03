/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const environment = {
  production: false,
  baseUrl: 'http://localhost:3000',
  KEYCLOAK: {
    URL: 'https://kc.public.apps.blockchain-europe.iml.fraunhofer.de',
    REALM: 'skala',
    CLIENT_ID: 'ap2-frontend',
  },
};
