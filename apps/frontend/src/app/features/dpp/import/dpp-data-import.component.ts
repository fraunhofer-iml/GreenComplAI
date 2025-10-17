/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialDto, ProductDto } from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DppService } from '../../../core/services/dpp/dpp.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { ProductDppCompareComponent } from './comparison/product-dpp-compare.component';

@Component({
  selector: 'app-dpp-data-import',
  imports: [CommonModule, MatListModule, ProductDppCompareComponent],
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

  dppMaterials = computed(() => {
    const res = {
      materials: this.dppQuery
        .data()
        ?.materials?.map((mm) => `${mm[0].name}: ${mm[1]} `),
      packagings: this.dppQuery.data()?.packagings?.map((p) => `${p[0].name}`),
    };
    return res;
  });

  productMaterials = computed(() => {
    const res = {
      materials: this.productQuery
        .data()
        ?.materials?.map((mm) => `${mm[0].name}: ${mm[1]} `),
      packagings: this.productQuery
        .data()
        ?.packagings?.map((p) => `${p[0].name}`),
    };
    return res;
  });
}
