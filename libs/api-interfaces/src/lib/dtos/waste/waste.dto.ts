/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneralWasteCreateDto, GeneralWasteDto } from './general-waste.dto';
import { WasteMaterialCreateDto, WasteMaterialDto } from './waste-material.dto';

export type WasteDto = {
  id: string;
  radioactiveAmount?: number;
  recycledWastePercentage: number;

  normalWaste: GeneralWasteDto;
  hazardousWaste?: GeneralWasteDto;

  wasteMaterials?: WasteMaterialDto[];
  hazardousType?: string;
};

export type WasteCreateDto = {
  wasteMaterials: WasteMaterialCreateDto[];
  radioactiveAmount?: number;
  recycledWastePercentage: number;
  hasHazardousWaste: boolean;
  normalWaste: GeneralWasteCreateDto;
  hazardousWaste?: GeneralWasteCreateDto;
  fieldsToValidate?: string[];
};
