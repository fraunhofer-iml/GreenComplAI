/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prisma } from '@prisma/client';

export const packagingFindManyQuery = (
  where: Prisma.PackagingWhereInput,
  skip: number,
  size: number,
  sorting: string
) =>
  ({
    where: where,
    skip: skip,
    take: size,
    orderBy: JSON.parse(sorting || '{}'),
    include: { material: true, supplier: { include: { addresses: true } } },
  }) satisfies Prisma.PackagingFindManyArgs;
