/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface UsagePhaseSubmoduleDto extends BaseSubmoduleDto {
  usageInstructions?: string[]; // Nutzungs-, Pflege- und Wartungsanleitungen
}
