/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface ESRSynergiesSubmoduleDto extends BaseSubmoduleDto {
  productCarbonFootprint?: number; // PCF in kgCO2e
  waterFootprint?: number; // Wasser-Fußabdruck in m3
  socialAspects?: string[]; // soziale Aspekte (Audits, Zertifikate)
}
