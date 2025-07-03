/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ValidUnits } from '@ap2/api-interfaces';

export const UNITS: Map<ValidUnits, string> = new Map([
  [ValidUnits.STK, 'Stück'],
  [ValidUnits.KG, 'Kilogramm'],
  [ValidUnits.G, 'Gramm'],
  [ValidUnits.L, 'Liter'],
  [ValidUnits.T, 'Tonne'],
  [ValidUnits.ML, 'Milliliter'],
  [ValidUnits.M, 'Meter'],
  [ValidUnits.M2, 'Quadratmeter'],
  [ValidUnits.M3, 'Kubikmeter'],
]);
