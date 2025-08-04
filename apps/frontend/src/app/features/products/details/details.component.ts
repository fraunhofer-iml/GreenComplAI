/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles, MaterialDto, ProductDto } from '@ap2/api-interfaces';
import moment, { Moment } from 'moment/moment';
import { Component, inject, Input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { FlagableComponent } from '../../../shared/components/flagable-element/flagable.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { ONLY_YEAR_FORMAT } from '../../../shared/constants/date-formats';
import { Uris } from '../../../shared/constants/uris';
import { BillOfMaterialComponent } from './bill-of-material/bill-of-material.component';
import { OrderHistoryComponent } from './order-history/order-history.component';
import { ProductPackagingComponent } from './product-packaging/product-packaging.component';
import { ProductWasteComponent } from './product-waste/product-waste.component';

@Component({
  selector: 'app-product-overview',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatButtonModule,
    OrderHistoryComponent,
    ReactiveFormsModule,
    BillOfMaterialComponent,
    ProductPackagingComponent,
    MatDividerModule,
    ProductWasteComponent,
    FlagableComponent,
  ],
  providers: [
    { provide: DataService, useClass: ProductsService },
    ProductsService,
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
  ],
  templateUrl: './details.component.html',
})
export class ProductDetailsComponent {
  Uris = Uris;

  wasteColumns: string[] = ['material', 'percentage', 'kgPerWaste'];
  readonly date = new FormControl();
  id$ = signal<string | null>(null);
  ContentType = ContentType;
  AuthRoles = AuthRoles;

  private productService = inject(ProductsService);

  productQuery = injectQuery(() => ({
    queryKey: ['products', this.id$()],
    queryFn: async (): Promise<ProductDto> => {
      return this.productService.getById(this.id$() ?? '');
    },
    enabled: !!this.id$(),
  }));

  private authService = inject(AuthenticationService);
  role = this.authService.getCurrentUserRole();

  @Input() set id(id: string) {
    this.id$.set(id);
  }

  displayMaterials(materials: [MaterialDto, number][]) {
    return materials.map((m) => `${m[0].name} (${m[1]} %)`).join(', ');
  }

  setYear(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.date.value ?? moment();
    ctrlValue.year(normalizedMonthAndYear.year());
    this.date.setValue(ctrlValue);
    datepicker.close();
  }
}
