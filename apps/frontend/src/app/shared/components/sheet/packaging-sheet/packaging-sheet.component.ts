/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingDto } from '@ap2/api-interfaces';
import { debounceTime } from 'rxjs';
import {
  Component,
  computed,
  inject,
  input,
  OnChanges,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { ProductPackagingFormGroup } from '../../../../features/products/create/model/product-form.model';
import { ConfirmUpdateDialogComponent } from '../../confirm-update-dialog/confirm-update.dialog';
import { PaginationComponent } from '../../pagination/pagination.component';
import { BaseSheetComponent } from '../base/sheet.component';

@Component({
  selector: 'app-packaging-sheet',
  imports: [
    MatCheckboxModule,
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    BaseSheetComponent,
    PaginationComponent,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
  ],
  templateUrl: './packaging-sheet.component.html',
})
export class PackagingSheetComponent implements OnChanges {
  @ViewChild('parentSheet', { static: false }) sheet:
    | BaseSheetComponent
    | undefined;

  searchValue = signal<string>('');
  showUpdateButton = input<boolean>(false);

  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  selectedPackagings: [PackagingDto, number][] = [];
  isSelectionValid = signal<boolean>(false);

  searchInput: FormControl<string | null> = new FormControl<string>('');

  packagings = input.required<FormGroup<ProductPackagingFormGroup>>();
  update = output<void>();

  private packagingService = inject(PackagingService);
  readonly dialog = inject(MatDialog);

  searchQuery = injectQuery(() => ({
    queryKey: ['packagings', this.searchValue(), this.page(), this.pageSize()],
    queryFn: async (): Promise<
      {
        packaging: PackagingDto;
        amount: FormControl<number>;
        selected: FormControl<boolean>;
      }[]
    > => {
      const response = await this.packagingService.fetchData(
        this.page(),
        this.pageSize(),
        this.searchValue(),
        ''
      );
      this.totalCount.set(response.meta?.totalCount || 0);
      return (
        response.data
          ?.filter(
            (dto) => !this.selectedPackagings.some((p) => p[0].id === dto.id)
          )
          .map((dto: PackagingDto) => this.createFormGroup(dto)) || []
      );
    },
  }));

  constructor() {
    this.searchInput.valueChanges
      .pipe(debounceTime(500))
      .subscribe((val) => this.searchValue.set(val ?? ''));
  }

  ngOnChanges() {
    this.packagings().controls.packagings.valueChanges.subscribe((val: any) => {
      this.selectedPackagings = val;
      this.searchQuery.refetch();
    });
  }

  addPackagings(
    selectedOptions: {
      packaging: PackagingDto;
      amount: FormControl<number>;
      selected: FormControl<boolean>;
    }[]
  ) {
    const options: [PackagingDto, number][] = selectedOptions
      .filter((o) => o.selected.value)
      .map((option) => [option.packaging, option.amount.value]);
    this.packagings().controls.packagings.patchValue([
      ...this.selectedPackagings,
      ...options,
    ]);

    this.searchQuery.refetch();
  }

  pageChange(page: number) {
    this.page.set(page);
  }

  pageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
    this.page.set(1);
  }

  remove(index: number) {
    this.packagings().controls.packagings.value.splice(index, 1);
    this.searchQuery.refetch();
  }

  validateSelection() {
    this.isSelectionValid.set(
      (this.searchQuery.data() ?? []).some((i) => i.selected.value) &&
        (this.searchQuery.data() ?? []).every((i) => i.amount.valid)
    );
  }

  close() {
    if (this.sheet) this.sheet.close();
  }

  open() {
    if (this.sheet) this.sheet.open();
  }

  private createFormGroup(dto: PackagingDto) {
    return {
      packaging: dto,
      amount: new FormControl<number>(1, {
        nonNullable: true,
        validators: Validators.required,
      }),
      selected: new FormControl(false, {
        nonNullable: true,
        validators: Validators.required,
      }),
    };
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
}
