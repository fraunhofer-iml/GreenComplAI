/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const getSorting = (sortingInput: string) => {
  const { key, direction } = parseSorting(sortingInput);

  const mapping = {
    numberOfStrategies: 'strategies',
    numberOfMeasures: 'measures',
    numberOfGoals: 'goals',
    amount: 'products',
  };

  if (mapping[key])
    return {
      [mapping[key]]: {
        _count: direction,
      },
    };

  if (key === 'supplierName' || key === 'supplier')
    return {
      supplier: {
        name: direction,
      },
    };

  if (key === 'wasteFlow' || key === 'productGroup') {
    return {
      [key]: { name: direction },
    };
  }

  return {
    [key]: direction,
  };
};

const parseSorting = (
  sortingInput: string
): { key: string; direction: 'asc' | 'desc' } => {
  const sorting: Record<string, 'asc' | 'desc'> = JSON.parse(sortingInput);
  const key = Object.keys(sorting)[0];
  const direction = sorting[key];

  return { key, direction };
};
