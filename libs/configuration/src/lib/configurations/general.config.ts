/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export const GENERAL_CONFIG_IDENTIFIER = 'general';

export interface GeneralConfiguration {
  amqpUri: string;
  logLevel: LogLevel[];
  swaggerPath: string;
}

export default registerAs(GENERAL_CONFIG_IDENTIFIER, () => ({
  amqpUri: process.env['AMQP_URI'] || 'amqp://localhost:5672',
  logLevel: (process.env['LOG_SETTINGS'] || 'error,verbose').split(','),
  swaggerPath: process.env['SWAGGER_PATH'] || 'api',
}));
