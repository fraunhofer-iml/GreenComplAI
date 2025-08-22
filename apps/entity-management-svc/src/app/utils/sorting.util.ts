/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const includeSupplierName = (sortingInput: string) => {
  const sorting: Record<string, 'asc' | 'desc'> = JSON.parse(sortingInput);
  const key = Object.keys(sorting)[0];
  const direction = sorting[key];

  if (key === 'supplierName' || key === 'supplier') {
    return {
      supplier: {
        name: direction,
      },
    };
  }

  return {
    [key]: direction,
  };
};
