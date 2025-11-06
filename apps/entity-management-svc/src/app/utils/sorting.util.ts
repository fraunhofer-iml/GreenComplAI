/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const getSorting = (sortingInput: string) => {
  // Handle empty or invalid sorting input
  if (!sortingInput || sortingInput.trim() === '') {
    return {};
  }

  const { key, direction } = parseSorting(sortingInput);

  // If parsing failed or no key/direction, return empty object
  if (!key || !direction) {
    return {};
  }

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
  try {
    const sorting: Record<string, 'asc' | 'desc'> = JSON.parse(sortingInput);

    // Validate that sorting is an object and has at least one key
    if (
      !sorting ||
      typeof sorting !== 'object' ||
      Object.keys(sorting).length === 0
    ) {
      return { key: '', direction: 'asc' };
    }

    const key = Object.keys(sorting)[0];
    const direction = sorting[key];

    // Validate direction is valid
    if (direction !== 'asc' && direction !== 'desc') {
      return { key: '', direction: 'asc' };
    }

    return { key, direction };
  } catch {
    // Return safe defaults if parsing fails
    return { key: '', direction: 'asc' };
  }
};
