/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NonUtilizableWasteCreateDto,
  NonUtilizableWasteDto,
} from './non-utilizable-waste.dto';
import {
  UtilizableWasteCreateDto,
  UtilizableWasteDto,
} from './utilizable-waste.dto';

export type GeneralWasteDto = {
  id: string;
  utilizableWaste: UtilizableWasteDto;
  nonUtilizableWaste: NonUtilizableWasteDto;
  hazardousType?: string;
};

export type GeneralWasteCreateDto = {
  utilizableWaste: UtilizableWasteCreateDto;
  nonUtilizableWaste: NonUtilizableWasteCreateDto;
};
