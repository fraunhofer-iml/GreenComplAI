/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface DppMaterialDto {
  name: string;
  weight: number; // Gewicht in kg
  percentage: number;
  isRenewable?: boolean; // erneuerbar / nicht-erneuerbar
  isPrimary?: boolean; // Primär- / Sekundärrohstoff
  isCritical?: boolean; // kritischer Rohstoff
}

export interface MaterialCompositionSubmoduleDto extends BaseSubmoduleDto {
  totalWeight: number; // Gesamtgewicht des Produkts in kg
  materials: DppMaterialDto[];
}
