/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const includeSupplierName = (sorting: string) => {
  const s: Record<string, 'asc' | 'desc'> = JSON.parse(sorting);
  const key = Object.keys(s)[0];
  const direction = s[key];

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
