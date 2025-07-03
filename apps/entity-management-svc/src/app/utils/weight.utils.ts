/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteCreateDto, WasteDto } from '@ap2/api-interfaces';

export const getTotalWeightOfWaste = (
  waste: Partial<WasteDto> | Partial<WasteCreateDto>
): number => {
  if (!waste) return 0;
  return (
    getTotalWeightOfNormalWaste(waste) + getTotalWeightOfHazardousWaste(waste)
  );
};

export const getTotalWeightOfNormalWaste = (
  waste: Partial<WasteDto> | Partial<WasteCreateDto>
): number => {
  if (!waste.normalWaste) {
    return 0;
  }
  return (
    waste.normalWaste.nonUtilizableWaste.landfillWeight +
    waste.normalWaste.nonUtilizableWaste.combustionWeight +
    waste.normalWaste.nonUtilizableWaste.miscellaneousWeight +
    waste.normalWaste.utilizableWaste.recyclingWeight +
    waste.normalWaste.utilizableWaste.preparationForRecyclingWeight +
    waste.normalWaste.utilizableWaste.miscellaneousWeight
  );
};

export const getTotalWeightOfHazardousWaste = (
  waste: Partial<WasteDto> | Partial<WasteCreateDto>
): number => {
  if (!waste.hazardousWaste) {
    return 0;
  }
  return (
    waste.hazardousWaste.nonUtilizableWaste.landfillWeight +
    waste.hazardousWaste.nonUtilizableWaste.combustionWeight +
    waste.hazardousWaste.nonUtilizableWaste.miscellaneousWeight +
    waste.hazardousWaste.utilizableWaste.recyclingWeight +
    waste.hazardousWaste.utilizableWaste.preparationForRecyclingWeight +
    waste.hazardousWaste.utilizableWaste.miscellaneousWeight
  );
};

export const getTotalWasteWeightNotRecyclable = (
  waste: Partial<WasteDto>
): number => {
  return (
    waste.hazardousWaste.nonUtilizableWaste.landfillWeight +
    waste.hazardousWaste.nonUtilizableWaste.combustionWeight +
    waste.hazardousWaste.nonUtilizableWaste.miscellaneousWeight +
    waste.normalWaste.nonUtilizableWaste.landfillWeight +
    waste.normalWaste.nonUtilizableWaste.combustionWeight +
    waste.normalWaste.nonUtilizableWaste.miscellaneousWeight
  );
};
