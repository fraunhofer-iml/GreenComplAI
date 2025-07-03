/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as moment from 'moment';
import { Moment } from 'moment';
import { CommonModule } from '@angular/common';
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
  selector: 'app-waste-flow',
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
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  templateUrl: './waste-flow.component.html',
})
export class WasteFlowComponent {
  fromYear$ = signal<Moment>(moment(new Date(2024, 0, 1)));
  toYear$ = signal<Moment>(moment(new Date(2025, 0, 1)));
  filter = signal<string>('');
  sorting = signal<
    [key: 'name' | 'producedItems' | 'wasteWeight', direction: SortDirection]
  >(['name', 'asc']);
  displayedColumns = [
    'name',
    'producedItems',
    'wasteWeight',
    'reusableNonHazardous',
    'reusableHazardous',
    'nonReusableNonHazardous',
    'nonReusableHazardous',
    'wasteWeightNotRecyclable',
    'wasteWeightNotRecyclablePercentage',
  ];

  productGroupId = input<string>();

  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  filteredAndSortedAnalysis = computed(() => {
    const response = this.analysisQuery
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
    return response;
  });

  analysisQuery = injectQuery(() => ({
    queryKey: [
      'waste-flow-analysis',
      this.fromYear$(),
      this.toYear$(),
      this.productGroupId(),
    ],
    queryFn: async () => {
      return await this.analysisService.getWasteFlowAnalysisOfProductGroups(
        this.fromYear$().year(),
        this.toYear$().year(),
        this.productGroupId()
      );
    },
  }));

  constructor(private readonly analysisService: AnalysisService) {}

  onFilterChange(value: string) {
    this.filter.set(value);
  }

  onSortChange(value: Sort) {
    this.sorting.set([
      value.active as 'name' | 'producedItems' | 'wasteWeight',
      value.direction,
    ]);
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

    this.filter.set('');
  }
}
