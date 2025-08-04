/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyDto } from '@ap2/api-interfaces';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatListModule, MatListOption } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../../core/services/companies/companies.service';
import { PaginationComponent } from '../../pagination/pagination.component';
import { BaseSheetComponent } from '../base/sheet.component';

@Component({
  selector: 'app-suppliers-sheet',
  imports: [
    MatFormFieldModule,
    MatListModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButton,
    MatInput,
    PaginationComponent,
    BaseSheetComponent,
  ],
  providers: [],
  templateUrl: './suppliers-sheet.component.html',
})
export class SuppliersSheetComponent {
  @ViewChild('parentSheet', { static: false }) sheet:
    | BaseSheetComponent
    | undefined;

  searchValue = signal<string>('');
  @Input() title!: string;
  @Output() resultEmitter: EventEmitter<MatListOption[]> = new EventEmitter();

  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  private companiesService = inject(CompaniesService);

  searchQuery = injectQuery(() => ({
    queryKey: ['companies', this.searchValue(), this.page(), this.pageSize()],
    queryFn: async (): Promise<
      { company: CompanyDto; amount: FormControl }[]
    > => {
      const response = await this.companiesService.fetchData(
        this.page(),
        this.pageSize(),
        this.searchValue(),
        ''
      );
      this.totalCount.set(response.meta?.totalCount || 0);
      return (
        response.data?.map((item: CompanyDto) => ({
          company: item,
          amount: new FormControl(1),
        })) || []
      );
    },
  }));

  search(value: string): void {
    this.searchValue.set(value);
  }

  addCompanies(selectedOptions: MatListOption[]) {
    this.resultEmitter.emit(selectedOptions);
  }

  close() {
    if (this.sheet) this.sheet.close();
  }

  open() {
    if (this.sheet) this.sheet.open();
  }

  pageChange(page: number) {
    this.page.set(page);
  }

  pageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
  }
}
