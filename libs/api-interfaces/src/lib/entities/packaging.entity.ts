/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export type PackagingEntity = Prisma.PackagingGetPayload<{
  include: {
    products: {
      include: {
        product: true;
      };
    };
    waste: {
      include: {
        hazardousWaste: {
          include: {
            utilizableWaste: true;
            nonUtilizableWaste: true;
          };
        };
        normalWaste: {
          include: {
            utilizableWaste: true;
            nonUtilizableWaste: true;
          };
        };
        wasteMaterials: {
          include: {
            material: true;
          };
        };
      };
    };
    materials: {
      include: {
        material: true;
      };
    };
    supplier: {
      include: {
        addresses: true;
      };
    };
  };
}>;

export type PackagingEntityList = Prisma.PackagingGetPayload<{
  include: {
    materials: {
      include: {
        material: true;
      };
    };
    supplier: {
      include: {
        addresses: true;
      };
    };
  };
}>;
