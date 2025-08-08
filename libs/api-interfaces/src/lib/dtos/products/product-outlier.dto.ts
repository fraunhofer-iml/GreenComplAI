/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class ProductOutlierDto {
  id: string;
  name: string;
  productId: string;
  productGroup: string;
  recycledWastePercentage: number;

  constructor(
    id: string,
    name: string,
    productId: string,
    productGroup: string,
    recycledWastePercentage: number
  ) {
    this.id = id;
    this.name = name;
    this.productId = productId;
    this.productGroup = productGroup;
    this.recycledWastePercentage = recycledWastePercentage;
  }
}
