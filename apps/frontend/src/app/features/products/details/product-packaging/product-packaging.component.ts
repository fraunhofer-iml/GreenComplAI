/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingDto, ProductUpdateMapDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { DecimalPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { FlagableComponent } from '../../../../shared/components/flagable-element/flagable.component';
import { PackagingSheetComponent } from '../../../../shared/components/sheet/packaging-sheet/packaging-sheet.component';
import { Uris } from '../../../../shared/constants/uris';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { ProductPackagingFormGroup } from '../../create/model/product-form.model';

@Component({
  selector: 'app-product-packaging',
  imports: [
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    RouterModule,
    PackagingSheetComponent,
    FlagableComponent,
    DecimalPipe,
  ],
  templateUrl: './product-packaging.component.html',
})
export class ProductPackagingComponent {
  packagingColumns: string[] = [
    'name',
    'material',
    'percentageOfBiologicalMaterials',
    'percentageOfRStrategies',
    'weight',
    'supplierId',
    'amount',
  ];

  Uris = Uris;

  id$ = input<string | null>(null);
  flags = input<string[]>([]);
  private readonly productService = inject(ProductsService);
  private readonly constructionService = inject(ProductConstructionService);
  packagingsForm: FormGroup<ProductPackagingFormGroup>;

  packagingQuery = injectQuery(() => ({
    queryKey: ['product-packaging', this.id$()],
    queryFn: async (): Promise<[PackagingDto, number][]> => {
      const packagings = await this.productService.getPackaging(
        this.id$() ?? ''
      );

      this.packagingsForm.controls.packagings.patchValue(packagings);
      return packagings;
    },
    enabled: !!this.id$(),
  }));

  constructor() {
    this.packagingsForm = new FormGroup<ProductPackagingFormGroup>({
      packagings: new FormControl<[PackagingDto, number][]>([], {
        nonNullable: true,
      }),
    });
  }

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: ProductUpdateMapDto) =>
      this.productService.updatePackagings(dto, this.id$() ?? ''),
    onSuccess: () => this.packagingQuery.refetch(),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  update() {
    const dto = this.constructionService.createUpdatePackagingDto(
      this.packagingsForm
    );
    this.updateMutation.mutate(dto);
  }
}
