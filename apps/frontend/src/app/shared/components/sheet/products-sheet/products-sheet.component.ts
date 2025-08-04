/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCreateDto, ProductDto } from '@ap2/api-interfaces';
import { debounceTime } from 'rxjs';
import { TextFieldModule } from '@angular/cdk/text-field';
import {
  Component,
  computed,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { BillOfMaterialFormGroup } from '../../../../features/products/create/model/product-form.model';
import { ConfirmUpdateDialogComponent } from '../../confirm-update-dialog/confirm-update.dialog';
import { PaginationComponent } from '../../pagination/pagination.component';
import { BaseSheetComponent } from '../base/sheet.component';
import { ImportPartListComponent } from './dialogs/importPartListComponent';
import { productFormControl } from './product.form-control';

@Component({
  selector: 'app-products-sheet',
  imports: [
    MatFormFieldModule,
    MatListModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    BaseSheetComponent,
    PaginationComponent,
    MatChipsModule,
    MatIconModule,
    MatCheckboxModule,
    TextFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDialogModule,
  ],
  providers: [],
  templateUrl: './products-sheet.component.html',
})
export class ProductsSheetComponent implements OnChanges {
  @ViewChild('parentSheet', { static: false }) sheet:
    | BaseSheetComponent
    | undefined;

  searchValue = signal<string>('');

  showUpdateButton = input(false);

  update = output<void>();

  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  isSelectionValid = signal<boolean>(false);

  searchInput: FormControl<string | null> = new FormControl<string>('');
  private productsService = inject(ProductsService);

  billOfMaterialForm = input.required<FormGroup<BillOfMaterialFormGroup>>();
  displayedBOMItems: [ProductDto, number][] = [];
  readonly dialog = inject(MatDialog);

  searchQuery = injectQuery(() => ({
    queryKey: ['products', this.searchValue(), this.page(), this.pageSize()],
    queryFn: async (): Promise<
      {
        product: ProductDto;
        amount: FormControl<number>;
        selected: FormControl<boolean>;
      }[]
    > => {
      const response = await this.productsService.fetchData(
        this.page(),
        this.pageSize(),
        this.searchValue(),
        ''
      );
      this.totalCount.set(response.meta?.totalCount || 0);

      return (
        response.data
          ?.filter(
            (product) =>
              !this.billOfMaterialForm().controls.billOfMaterial.value.some(
                (p) => p[0].id === product.id
              )
          )
          .map((dto: ProductDto) => productFormControl(dto)) || []
      );
    },
  }));

  constructor() {
    this.searchInput.valueChanges
      .pipe(debounceTime(500))
      .subscribe((val) => this.searchValue.set(val ?? ''));
  }

  ngOnChanges(ch: SimpleChanges) {
    this.billOfMaterialForm().controls.billOfMaterial.valueChanges.subscribe(
      (val) => {
        this.displayedBOMItems = val;
        this.searchQuery.refetch();
      }
    );
  }

  open() {
    if (this.sheet) this.sheet.open();
  }

  addProducts(
    selectedOptions: {
      product: ProductDto;
      amount: FormControl<number>;
      selected: FormControl<boolean>;
    }[]
  ) {
    const options: [ProductDto, number][] = selectedOptions
      .filter((o) => o.selected.value)
      .map((option) => [option.product, option.amount.value]);

    this.billOfMaterialForm().controls.billOfMaterial.patchValue([
      ...this.billOfMaterialForm().controls.billOfMaterial.value,
      ...options,
    ]);
  }

  pageChange(page: number) {
    this.page.set(page);
  }

  pageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  remove(index: number) {
    this.billOfMaterialForm().controls.billOfMaterial.value.splice(index, 1);
    // this.displayedBOMItems.splice(index, 1);
    this.searchQuery.refetch();
  }

  validateSelection() {
    this.isSelectionValid.set(
      (this.searchQuery.data() ?? []).some((i) => i.selected.value) &&
        (this.searchQuery.data() ?? []).every((i) => i.amount.valid)
    );
  }

  openDialog() {
    this.dialog
      .open(ConfirmUpdateDialogComponent)
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.sheet?.close();
          this.update.emit();
        }
      });
  }

  openImportItemListDialog() {
    const ref = this.dialog.open(ImportPartListComponent, { maxWidth: '100%' });
    ref.afterClosed().subscribe((result: any[]) => {
      if (result) {
        const formattedResult = result.map((item) => ({
          product: item,
          amount: new FormControl(item.amount, { nonNullable: true }),
          selected: new FormControl(true, { nonNullable: true }),
        }));
        this.addProducts(formattedResult);
        this.sheet?.close();
      }
    });
  }
}
