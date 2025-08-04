/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto, ProductUpdateMapDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { elementAt } from 'rxjs';

import { Component, inject, input, OnChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { FlagableComponent } from '../../../../shared/components/flagable-element/flagable.component';
import { ProductsSheetComponent } from '../../../../shared/components/sheet/products-sheet/products-sheet.component';
import { Uris } from '../../../../shared/constants/uris';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { BillOfMaterialFormGroup } from '../../create/model/product-form.model';

@Component({
  selector: 'app-bill-of-material',
  imports: [
    RouterModule,
    MatTableModule,
    ProductsSheetComponent,
    MatIconModule,
    MatButtonModule,
    FlagableComponent
],
  templateUrl: './bill-of-material.component.html',
})
export class BillOfMaterialComponent implements OnChanges {
  productService = inject(ProductsService);

  id$ = input<string>();
  flags = input<string[]>([]);
  Uris = Uris;

  displayedColumns: string[] = [
    'name',
    'supplier',
    'price',
    'amount',
    'totalPrice',
  ];

  description = input<string>('');

  billOfMaterialForm: FormGroup<BillOfMaterialFormGroup>;

  preliminaryProductsQuery = injectQuery(() => ({
    queryKey: ['preliminaryProducts', this.id$()],
    queryFn: async () => {
      const products = await this.productService.getPreliminary(
        this.id$() ?? ''
      );

      this.billOfMaterialForm.controls.billOfMaterial.patchValue(products);
      return products;
    },
    enabled: !!this.id$(),
  }));

  ngOnChanges(): void {
    this.billOfMaterialForm.controls.billOfMaterialDescription.patchValue(
      this.description() ?? ''
    );
  }

  constructor(
    private readonly productsService: ProductsService,
    private readonly constructionService: ProductConstructionService
  ) {
    this.billOfMaterialForm = new FormGroup<BillOfMaterialFormGroup>({
      billOfMaterialDescription: new FormControl(),
      billOfMaterial: new FormControl<[ProductDto, number][]>([], {
        nonNullable: true,
      }),
    });
  }

  selectedProducts: [ProductDto, number][] = [];

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: ProductUpdateMapDto) =>
      this.productsService.updateBOM(dto, this.id$() ?? ''),
    onSuccess: () => this.preliminaryProductsQuery.refetch(),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  update() {
    this.updateMutation.mutate(
      this.constructionService.createUpdateBOMDto(this.billOfMaterialForm)
    );
  }

  protected readonly elementAt = elementAt;
}
