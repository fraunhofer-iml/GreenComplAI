/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalysisDto, ProductDto } from '@ap2/api-interfaces';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../core/services/products/products.service';

@Component({
  selector: 'app-analysis',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatAutocompleteModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './analysis.component.html',
})
export class AnalysisComponent {
  amount$ = signal<number>(1);
  selectedId$ = signal<string>('');

  @Input() set id(id: string) {
    this.id$.set(id);
  }

  id$ = signal<string>('');
  productSearchValue$ = signal<string>('');
  unit = '';

  form = new FormGroup({
    amount: new FormControl<number>(1, Validators.required),
    product: new FormControl<ProductDto | undefined>(
      undefined,
      Validators.required
    ),
  });

  analysisQuery = injectQuery(() => ({
    queryKey: ['analysis', this.amount$(), this.selectedId$()],
    queryFn: async (): Promise<AnalysisDto> => {
      return this.productsService.getAnalysis(
        this.amount$(),
        this.selectedId$()
      );
    },
    enabled: this.selectedId$().length > 0 && this.amount$() > 0,
  }));

  searchProductsQuery = injectQuery(() => ({
    queryKey: ['searchProducts', this.productSearchValue$()],
    queryFn: () =>
      this.productsService.fetchData(1, 5, this.productSearchValue$(), '{}'),
  }));

  getProductQuery = injectQuery(() => ({
    queryKey: ['searchOneProduct', this.id$()],
    queryFn: async () => {
      const p = await this.productsService.getById(this.id$());
      this.form.controls.product.patchValue(p);
      return p;
    },
    enabled: !!this.id$() && this.id$().length > 0,
  }));

  constructor(private readonly productsService: ProductsService) {
    this.form.valueChanges.pipe(debounceTime(500)).subscribe((val) => {
      this.amount$.set(val.amount ?? 0);
      this.selectedId$.set(val.product?.id ?? '');
      this.unit = val.product?.unit ?? '';
    });
  }

  displayFn(product: ProductDto): string {
    return product ? product.name : '';
  }
}
