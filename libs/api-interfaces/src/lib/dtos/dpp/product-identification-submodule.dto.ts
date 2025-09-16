/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface SupplierDto {
  name: string;
  isImporter: boolean;
}

export interface ImporterDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ProductIdentificationSubmoduleDto extends BaseSubmoduleDto {
  uniqueProductIdentifier: string; // ProductID
  gtin?: string; // Global Trade Item Number
  taricCode?: string; // TARIC-Code / Warennummer
  supplier?: SupplierDto;
  importer?: ImporterDto;
}
