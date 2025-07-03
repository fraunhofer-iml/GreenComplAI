/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCreateDto } from '../product-create.dto';
import { ProductDto } from '../product.dto';

export class ProductUpdateMapDto {
  description?: string;
  map: [string, number][];

  constructor(map: [string, number][], description?: string) {
    this.description = description;
    this.map = map;
  }
}
