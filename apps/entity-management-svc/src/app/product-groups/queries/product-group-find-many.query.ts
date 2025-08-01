/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const productGroupFindManyQuery = ({
  where,
  size,
  skip,
  sorting,
}: {
  skip: number;
  size: number;
  where: unknown;
  sorting: string;
}) => ({
  skip: skip,
  take: size,
  where: where,
  include: {
    _count: {
      select: { products: true },
    },
    products: true,
    wasteFlow: true,
    variants: true,
  },
  orderBy: JSON.parse(sorting || '{}'),
});
