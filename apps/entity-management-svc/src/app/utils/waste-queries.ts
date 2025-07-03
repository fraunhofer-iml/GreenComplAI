/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneralWasteCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';

export const createUtilizableAndNonUtilizableWaste = (
  waste: GeneralWasteCreateDto
) =>
  ({
    create: {
      nonUtilizableWaste: {
        create: {
          landfillWeight: waste.nonUtilizableWaste.landfillWeight ?? 0,
          combustionWeight: waste.nonUtilizableWaste.combustionWeight ?? 0,
          miscellaneousWeight:
            waste.nonUtilizableWaste.miscellaneousWeight ?? 0,
        },
      },
      utilizableWaste: {
        create: {
          preparationForRecyclingWeight:
            waste.utilizableWaste.preparationForRecyclingWeight ?? 0,
          recyclingWeight: waste.utilizableWaste.recyclingWeight ?? 0,
          miscellaneousWeight: waste.utilizableWaste.miscellaneousWeight ?? 0,
        },
      },
    },
  }) satisfies Prisma.GeneralWasteCreateNestedOneWithoutNormalWasteInput;

export const getNormalAndHazardousWaste = () =>
  ({
    hazardousWaste: {
      include: {
        utilizableWaste: true,
        nonUtilizableWaste: true,
      },
    },
    normalWaste: {
      include: {
        utilizableWaste: true,
        nonUtilizableWaste: true,
      },
    },
  }) satisfies Prisma.WasteSelect;
