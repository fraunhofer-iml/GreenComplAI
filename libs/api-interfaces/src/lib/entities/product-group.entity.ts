/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export type ProductGroupEntity = Prisma.ProductGroupGetPayload<{
  include: {
    products: {
      include: {
        supplier: {
          include: {
            addresses: true;
          };
        };
        waste: {
          include: {
            hazardousWaste: {
              include: {
                nonUtilizableWaste: true;
                utilizableWaste: true;
              };
            };
            normalWaste: {
              include: {
                nonUtilizableWaste: true;
                utilizableWaste: true;
              };
            };
            wasteMaterials: {
              select: {
                percentage: true;
                material: {
                  select: {
                    name: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    variants: true;
    wasteFlow: true;
    _count?: {
      select: {
        products: true;
      };
    };
  };
}>;

export type ProductGroupEntityList = Prisma.ProductGroupGetPayload<{
  include: {
    products: {
      include: {
        waste: true;
      };
    };
    variants: true;
    wasteFlow: true;
    _count: {
      select: {
        products: true;
      };
    };
  };
}>;
