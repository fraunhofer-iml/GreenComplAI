/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { debounceTime } from 'rxjs';

import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { TooltipMessages } from '../../../../shared/constants/messages';

@Component({
  selector: 'app-product-table',
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatTooltipModule
],
  templateUrl: './product-table.component.html',
})
export class ProductTableComponent {
  pageSize = 10;
  pageIndex = 0;
  filter = '';
  sorting = {};
  additionals = new Map<string, string>();

  formGroup = new FormGroup({
    filter: new FormControl(''),
  });

  displayedColumns = [
    'flagged',
    'productGroup',
    'productId',
    'name',
    'description',
    'category',
    'supplier',
    'percentageOfBiologicalMaterials',
    'wasteFlow',
    'circularPrinciple',
  ];

  productService = inject(ProductsService);

  query = injectQuery(() => ({
    queryKey: ['products'],
    queryFn: async () => {
      return await this.productService.fetchData(
        this.pageIndex + 1,
        this.pageSize,
        this.filter,
        JSON.stringify(this.sorting),
        this.additionals
      );
    },
  }));

  constructor() {
    this.formGroup.controls.filter.valueChanges
      .pipe(debounceTime(500))
      .subscribe((value) => this.onFilterChange(value ?? ''));
  }

  updateTable(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.query.refetch();
  }

  onFilterChange(value: string) {
    this.filter = value;
    this.query.refetch();
  }

  onIsSellableChange(value: string) {
    switch (value) {
      case 'product':
        this.additionals.set('isSellable', 'true');
        break;
      case 'preliminary':
        this.additionals.set('isSellable', 'false');
        break;
      case 'all':
        this.additionals.delete('isSellable');
        break;
    }
    this.query.refetch();
  }

  onSortChange(value: Sort) {
    this.sorting = {
      [value.active]: value.direction,
    };
    this.query.refetch();
  }

  protected readonly TooltipMessages = TooltipMessages;
}
