/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialDto } from '../material';

export type WasteMaterialDto = {
  percentage: number;
  weightInKg?: number;
  material?: MaterialDto;
};
export type WasteMaterialCreateDto = {
  percentage: number;
  material: string;
};
