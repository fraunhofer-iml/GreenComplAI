/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto, ProductUpdateHistoryDto } from '@ap2/api-interfaces';
import { Component, inject, Input, input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { FlagableComponent } from '../../../../shared/components/flagable-element/flagable.component';
import { BaseSheetComponent } from '../../../../shared/components/sheet/base/sheet.component';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { ProducedItemsFormGroup } from '../../create/model/product-form.model';
import {
  addProducedItems,
  producedItemsFormGroup,
  removeProducedItemFormGroup,
} from '../../create/produced-items.form-group';
import { SelectProducedPerYearComponent } from '../../create/select-produced-per-year.sheet/select-produced-per-year.component';

@Component({
  selector: 'app-order-history',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    BaseSheetComponent,
    SelectProducedPerYearComponent,
    FlagableComponent,
  ],
  templateUrl: './order-history.component.html',
})
export class OrderHistoryComponent {
  private readonly productService = inject(ProductsService);
  private readonly productConstructionService = inject(
    ProductConstructionService
  );

  @Input() productId?: string | null;
  year = input(new FormControl());

  product = input<Partial<ProductDto>>();

  analysisQuery = injectQuery(() => ({
    queryKey: ['order-history-analysis', this.productId, this.year()],
    queryFn: async () => {
      const product = await this.productService.getById(this.productId ?? '');

      if (this.year())
        product.productionHistory = product.productionHistory?.filter(
          (history) => history.year === this.year().value
        );

      this.setHistory(product.productionHistory ?? []);
      return product;
    },
    enabled: !!this.productId && !!this.year(),
  }));

  updateHistoryMutation = injectMutation(() => ({
    mutationFn: (params: { dto: ProductUpdateHistoryDto; id: string }) =>
      this.productService.updateHistory(params.dto, params.id),
    onSuccess: () => {
      this.analysisQuery.refetch();
    },
  }));

  historyColumns = ['year', 'amount'];

  producedItemsForm: FormGroup<ProducedItemsFormGroup>;

  addProducedItems = addProducedItems;
  removeProducedItemFormGroup = removeProducedItemFormGroup;

  constructor() {
    this.producedItemsForm = producedItemsFormGroup();
  }

  setHistory(history: { amount: number; year: number }[]): void {
    if (history.length === 0) return;
    this.producedItemsForm.controls.producedItems.clear();
    history.forEach((item) => {
      this.producedItemsForm.controls.producedItems.push(
        new FormGroup({
          amount: new FormControl<number | null>(item.amount),
          year: new FormControl<Date | null>(new Date(item.year, 1, 1)),
        })
      );
    });
  }

  save(productionHistory: FormGroup<ProducedItemsFormGroup>) {
    if (!this.product()?.id) return;
    const dto: ProductUpdateHistoryDto =
      this.productConstructionService.createUpdateProductionHistoryDto(
        productionHistory
      );
    this.updateHistoryMutation.mutate({ dto: dto, id: this.product()!.id! });
  }
}
