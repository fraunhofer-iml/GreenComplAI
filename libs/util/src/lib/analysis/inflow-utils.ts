/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const aggregateItemsWithAmount = (
  materials: [string, number][]
): [string, number][] => {
  const res = materials.reduce(
    (acc, [name, amount]) => {
      const index = acc.findIndex((item: [string, number]) => item[0] === name);
      if (index > -1) {
        acc[index][1] += amount;
      } else {
        acc.push([name, amount]);
      }
      return acc;
    },
    [] as [string, number][]
  );
  return res.sort((a, b) => a[0].localeCompare(b[0]));
};
