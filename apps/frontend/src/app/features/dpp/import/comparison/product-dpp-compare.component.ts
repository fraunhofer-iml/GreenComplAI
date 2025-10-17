/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-product-dpp-compare',
  imports: [CommonModule],
  templateUrl: './product-dpp-compare.component.html',
})
export class ProductDppCompareComponent {
  protected readonly Array = Array;

  dppData = input<string | string[]>();
  productData = input<string | string[]>();
  title = input<string>();
}
