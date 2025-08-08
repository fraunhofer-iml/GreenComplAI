/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { toast } from 'ngx-sonner';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';

@Component({
  selector: 'app-outlier-table',
  imports: [
    RouterModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './outlier-table.component.html',
})
export class OutlierTableComponent {
  displayedColumns = ['productGroup', 'productId', 'name', 'outlier', 'button'];

  productService = inject(ProductsService);

  query = injectQuery(() => ({
    queryKey: ['outliers'],
    queryFn: () => this.productService.fetchOutliers(),
  }));

  validationMutation = injectMutation(() => ({
    mutationFn: (props: { id: string; key: string }) =>
      this.productService.validateOutlier(props.id, [props.key]),
    onError: () => toast.error('Das Produkt konnte nicht validiert werden'),
    onSuccess: () => {
      toast.success('Validierung erfolgreich');
      this.query.refetch();
    },
  }));
}
