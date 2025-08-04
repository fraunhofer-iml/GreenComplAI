/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaginatedData,
  ProductDto,
  ProductGroupDto,
} from '@ap2/api-interfaces';
import moment from 'moment';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { ONLY_YEAR_FORMAT } from '../../../shared/constants/date-formats';
import { InflowAnalysisGraphComponent } from '../inflow/inflow-analysis-graph.component';
import { WasteflowAnalysisGraphComponent } from '../wasteflow/wasteflow-analysis-graph.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    InflowAnalysisGraphComponent,
    FormsModule,
    MatAutocompleteModule,
    RouterModule,
    WasteflowAnalysisGraphComponent,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly groupService = inject(ProductGroupService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  productGroupId = input<string>();
  productId = input<string>();

  fromYear = moment(new Date());
  toYear = moment(new Date());
  groupSearchValue = signal<string>('');

  productGroup: ProductGroupDto | undefined = undefined;
  product: ProductDto | undefined = undefined;

  fromYearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.fromYear = moment(event);
    picker.close();
  }

  toYearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.toYear = moment(event);
    picker.close();
  }

  groupsQuery = injectQuery(() => ({
    queryKey: ['getProductGroups', this.groupSearchValue()],
    queryFn: async () => {
      const groups = await this.groupService.fetchData(
        1,
        5,
        this.groupSearchValue(),
        '{}'
      );
      this.setInputValues(groups);
      return groups;
    },
  }));

  displayFn(p: ProductGroupDto | ProductDto): string {
    return p ? p.name : '';
  }

  private setInputValues(groups: PaginatedData<ProductGroupDto>) {
    if (this.productGroupId()) {
      this.productGroup = groups.data?.find(
        (g) => g.id === this.productGroupId()
      );
      if (this.productGroup && this.productGroupId())
        this.product = this.productGroup.products?.find(
          (p) => p.id === this.productId()
        );
    }
  }

  navigate() {
    const queryParams: Params = {
      productGroupId: this.productGroup?.id,
      productId: this.product?.id,
    };

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
    });
  }
}
