/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterModule } from '@angular/router';
import { DataService } from '../../../core/services/data-service/data.service';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { OverviewComponent } from '../../../shared/components/overview/overview.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { BaseSheetComponent } from '../../../shared/components/sheet/base/sheet.component';
import { ProductGroupCreateComponent } from '../create/product-group-create.component';
import { InflowComponent } from './inflow/inflow.component';
import { WasteFlowComponent } from './waste-flow/waste-flow.component';

@Component({
  selector: 'app-product-group-overview',
  imports: [
    OverviewComponent,
    MatButtonModule,
    RouterModule,
    BaseSheetComponent,
    ProductGroupCreateComponent,
    InflowComponent,
    WasteFlowComponent,
    MatExpansionModule,
    RouterModule,
  ],
  providers: [{ provide: DataService, useClass: ProductGroupService }],
  templateUrl: './product-group-overview.component.html',
})
export class ProductGroupOverviewComponent {
  ContentType = ContentType;
  productGroupId = input<string>();
}
