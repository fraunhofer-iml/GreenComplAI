/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface PackagingMaterialDto {
  name: string;
  weight: number;
  isRenewable?: boolean;
  isPrimary?: boolean;
}

export interface PackagingSubmoduleDto extends BaseSubmoduleDto {
  totalWeight: number; // Gesamtgewicht der Verpackung in kg
  packagingMaterials: PackagingMaterialDto[];
}
