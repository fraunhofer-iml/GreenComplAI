/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto } from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DppService } from '../../../core/services/dpp/dpp.service';
import { ProductsService } from '../../../core/services/products/products.service';

@Component({
  selector: 'app-dpp-data-import',
  imports: [CommonModule],
  providers: [DppService],
  templateUrl: './dpp-data-import.component.html',
})
export class DppDataImportComponent {
  private readonly dppService = inject(DppService);
  private readonly productService = inject(ProductsService);
  id = input<string>('id');

  dppQuery = injectQuery(() => ({
    queryKey: ['dpp', this.id()],
    queryFn: async (): Promise<ProductDto> =>
      this.dppService.importProductFRomDpp(this.id() ?? ''),
    enabled: !!this.id(),
  }));

  productQuery = injectQuery(() => ({
    queryKey: ['product', this.id()],
    queryFn: async (): Promise<ProductDto> =>
      this.productService.getById(this.id() ?? ''),
    enabled: !!this.id(),
  }));
}
