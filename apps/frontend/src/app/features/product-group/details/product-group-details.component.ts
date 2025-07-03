/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductGroupDto } from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { BaseSheetComponent } from '../../../shared/components/sheet/base/sheet.component';
import { TooltipMessages } from '../../../shared/constants/messages';
import { Uris } from '../../../shared/constants/uris';
import { ProductGroupCreateComponent } from '../create/product-group-create.component';

@Component({
  selector: 'app-product-group-details',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatChipsModule,
    MatButtonModule,
    BaseSheetComponent,
    ProductGroupCreateComponent,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './product-group-details.component.html',
})
export class ProductGroupDetailsComponent {
  Uris = Uris;
  private readonly productGroupService = inject(ProductGroupService);

  displayedColumns: string[] = ['name', 'productId', 'supplier', 'price'];
  wastedisplayedColumns: string[] = ['wasteName', 'wasteWeight'];

  @Input() set id(id: string) {
    this.id$.set(id);
  }

  id$ = signal<string | null>(null);

  groupQuery = injectQuery(() => ({
    queryKey: ['groups', this.id$()],
    queryFn: async (): Promise<ProductGroupDto> => {
      return this.productGroupService.getById(this.id$() ?? '');
    },
    enabled: !!this.id$(),
  }));
  protected readonly TooltipMessages = TooltipMessages;
}
