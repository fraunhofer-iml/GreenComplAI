/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { debounceTime } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../../core/services/authentication/authentication.service';
import { ProductsService } from '../../../../core/services/products/products.service';
import { SupplierService } from '../../../../core/services/suppliers/suppliers.service';
import { TooltipMessages } from '../../../../shared/constants/messages';
import { UnitPipe } from '../../../../shared/utils/unit.pipe';

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
    MatTooltipModule,
    DecimalPipe,
    UnitPipe,
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

  dataSource = new MatTableDataSource<any>([]);

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

  supplierDisplayedColumns = [
    'name',
    'description',
    'percentageOfBiologicalMaterials',
    'wasteFlow',
    'circularPrinciple',
  ];

  productService = inject(ProductsService);
  supplierService = inject(SupplierService);
  authService = inject(AuthenticationService);

  query = injectQuery(() => ({
    queryKey: ['products'],
    queryFn: async () => {
      if (this.authService.isSupplier()) {
        return await this.supplierService.fetchData(
          this.pageIndex + 1,
          this.pageSize,
          this.filter,
          JSON.stringify(this.sorting),
          this.additionals
        );
      }

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
      .pipe(debounceTime(300))
      .subscribe((value) => {
        this.dataSource.filter = value?.trim().toLowerCase() || '';
      });

    effect(() => {
      const result = this.query.data(); // <=== Signal auslesen

      if (result?.data) {
        this.dataSource.data = result.data;
      }
    });

    this.dataSource.filterPredicate = (data, filter) => {
      const term = filter.trim().toLowerCase();

      return (
        data.name?.toLowerCase().includes(term) ||
        data.description?.toLowerCase().includes(term)
      );
    };
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
