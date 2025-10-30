/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export type WasteEntity = Prisma.WasteGetPayload<{
  include: {
    wasteMaterials: {
      include: {
        material: true;
      };
    };
    normalWaste: {
      include: {
        nonUtilizableWaste: true;
        utilizableWaste: true;
      };
    };
    hazardousWaste: {
      include: {
        nonUtilizableWaste: true;
        utilizableWaste: true;
      };
    };
  };
}>;

export type WasteMaterialEntity = Prisma.WasteMaterialGetPayload<{
  include: {
    material: true;
  };
}>;
