/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MaterialDto,
  WasteDto,
  WasteEntity,
  WasteMaterialDto,
  WasteMaterialEntity,
} from '@ap2/api-interfaces';

export function toWasteDto(entity: WasteEntity | null): WasteDto | null {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    recycledWastePercentage: entity.recycledWastePercentage,
    radioactiveAmount: entity.radioactiveAmount ?? 0,
    wasteMaterials:
      entity.wasteMaterials?.map((wm) => ({
        material: wm.material ? new MaterialDto(wm.material.name) : undefined,
        percentage: wm.percentage,
      })) ?? [],
    normalWaste:
      entity.normalWaste &&
      entity.normalWaste.utilizableWaste &&
      entity.normalWaste.nonUtilizableWaste
        ? {
            id: entity.normalWaste.id,
            utilizableWaste: {
              id: entity.normalWaste.utilizableWaste.id,
              preparationForRecyclingWeight:
                entity.normalWaste.utilizableWaste.preparationForRecyclingWeight,
              recyclingWeight: entity.normalWaste.utilizableWaste.recyclingWeight,
              miscellaneousWeight:
                entity.normalWaste.utilizableWaste.miscellaneousWeight,
            },
            nonUtilizableWaste: {
              id: entity.normalWaste.nonUtilizableWaste.id,
              landfillWeight:
                entity.normalWaste.nonUtilizableWaste.landfillWeight,
              combustionWeight:
                entity.normalWaste.nonUtilizableWaste.combustionWeight,
              miscellaneousWeight:
                entity.normalWaste.nonUtilizableWaste.miscellaneousWeight,
            },
          }
        : undefined,
    hazardousWaste:
      entity.hazardousWaste &&
      entity.hazardousWaste.utilizableWaste &&
      entity.hazardousWaste.nonUtilizableWaste
        ? {
            id: entity.hazardousWaste.id,
            utilizableWaste: {
              id: entity.hazardousWaste.utilizableWaste.id,
              preparationForRecyclingWeight:
                entity.hazardousWaste.utilizableWaste
                  .preparationForRecyclingWeight,
              recyclingWeight:
                entity.hazardousWaste.utilizableWaste.recyclingWeight,
              miscellaneousWeight:
                entity.hazardousWaste.utilizableWaste.miscellaneousWeight,
            },
            nonUtilizableWaste: {
              id: entity.hazardousWaste.nonUtilizableWaste.id,
              landfillWeight:
                entity.hazardousWaste.nonUtilizableWaste.landfillWeight,
              combustionWeight:
                entity.hazardousWaste.nonUtilizableWaste.combustionWeight,
              miscellaneousWeight:
                entity.hazardousWaste.nonUtilizableWaste.miscellaneousWeight,
            },
          }
        : undefined,
  };
}

export function toWasteMaterialDto(
  entity: WasteMaterialEntity
): WasteMaterialDto {
  return {
    material: entity.material
      ? new MaterialDto(entity.material.name)
      : undefined,
    percentage: entity.percentage,
  };
}
