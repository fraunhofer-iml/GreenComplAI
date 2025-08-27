/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const getFilterAsBool = (filter: string) => {
  let filterAsBool: undefined | boolean = undefined;
  if (filter.toLowerCase() === 'ja' || filter.toLowerCase() === 'true')
    filterAsBool = true;
  if (filter.toLowerCase() === 'nein' || filter.toLowerCase() === 'false')
    filterAsBool = false;

  return filterAsBool;
};
