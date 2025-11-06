/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerAs } from '@nestjs/config';

export const BASYX_CONFIG_IDENTIFIER = 'basyx';

export interface BasyxConfiguration {
  baseUrl: string;
}

export default registerAs(BASYX_CONFIG_IDENTIFIER, () => ({
  baseUrl: process.env['BASYX_BASE_URL'] || 'http://localhost:8081',
}));
