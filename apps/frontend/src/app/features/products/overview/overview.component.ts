/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { DataService } from '../../../core/services/data-service/data.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { ProductTableComponent } from './product-table/product-table.component';

@Component({
  selector: 'app-product-overview',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,
    ProductTableComponent,
  ],
  providers: [{ provide: DataService, useClass: ProductsService }],
  templateUrl: './overview.component.html',
})
export class ProductOverviewComponent {
  protected readonly ContentType = ContentType;
}
