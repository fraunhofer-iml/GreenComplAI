/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import moment, { Moment } from 'moment';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AnalysisService } from '../../../../core/services/analysis/analysis.service';
import { ONLY_YEAR_FORMAT } from '../../../../shared/constants/date-formats';

@Component({
  selector: 'app-inflow',
  imports: [
    CommonModule,
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
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
    DecimalPipe,
  ],
  templateUrl: './inflow.component.html',
})
export class InflowComponent {
  private readonly analysisService = inject(AnalysisService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly decimalPipe = inject(DecimalPipe);

  fromYear$ = signal<Moment>(moment(new Date(2024, 0, 1)));
  toYear$ = signal<Moment>(moment(new Date(2025, 0, 1)));
  filter = signal<string>('');
  sorting = signal<[key: 'name' | 'amount', direction: SortDirection]>([
    'name',
    'asc',
  ]);
  displayedColumns = [
    'name',
    'amount',
    'materials',
    'packagings',
    'criticalMaterials',
    'rareEarths',
    'water',
  ];

  productGroupId = input<string>();

  filteredAndSortedAnalysis = computed(() => {
    return this.analysisQuery
      .data()
      ?.analysis.filter((a) =>
        a.name.toLocaleLowerCase().includes(this.filter().toLocaleLowerCase())
      )
      .sort((a, b) => {
        if (this.sorting()[1] === 'asc') {
          return a[this.sorting()[0]] < b[this.sorting()[0]] ? -1 : 1;
        } else {
          return b[this.sorting()[0]] < a[this.sorting()[0]] ? -1 : 1;
        }
      });
  });

  analysisQuery = injectQuery(() => ({
    queryKey: [
      'inflow-analysis',
      this.fromYear$(),
      this.toYear$(),
      this.filter(),
      this.productGroupId(),
    ],
    queryFn: async () => {
      return await this.analysisService.getInFlowAnalysisOfProductGroups(
        this.fromYear$().year(),
        this.toYear$().year(),
        this.filter(),
        this.productGroupId()
      );
    },
  }));

  onFilterChange(value: string) {
    this.filter.set(value);
    this.analysisQuery.refetch();
  }

  onSortChange(value: Sort) {
    this.sorting.set([value.active as 'name' | 'amount', value.direction]);
  }

  fromYearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.fromYear$.set(moment(event));
    picker.close();
  }

  toYearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.toYear$.set(moment(event));
    picker.close();
  }

  public navigate(productGroupId?: string) {
    // We are already on the product group page
    if (this.productGroupId()) return;

    const queryParams: Params = { productGroupId };

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: queryParams,
    });
  }

  displayMaterials(map: [string, number][]) {
    return map && map.length > 0
      ? map
          .map(
            (item) =>
              `${item[0]} (${this.decimalPipe.transform(item[1], '1.0-2')} kg)`
          )
          .join(', ')
      : 'keine Angabe';
  }

  displayPackagings(map: [string, number][]) {
    return map && map.length > 0
      ? map
          .map(
            (item) =>
              `${item[0]} (${this.decimalPipe.transform(item[1], '1.0-2')})`
          )
          .join(', ')
      : 'keine Angabe';
  }

  displayArray(arr: string[]) {
    return arr && arr.length > 0 ? arr.join(', ') : 'keine Angabe';
  }

  back() {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
    });
  }
}
