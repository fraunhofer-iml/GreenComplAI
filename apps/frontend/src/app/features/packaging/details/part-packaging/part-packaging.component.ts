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
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { PackagingSheetComponent } from '../../../../shared/components/sheet/packaging-sheet/packaging-sheet.component';
import { Uris } from '../../../../shared/constants/uris';
import { ProductConstructionService } from '../../../products/create/form-construction/product-construction.service';
import { ProductPackagingFormGroup } from '../../../products/create/model/product-form.model';

@Component({
  selector: 'app-part-packaging',
  imports: [
    PackagingSheetComponent,
    RouterModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    DecimalPipe,
  ],
  templateUrl: './part-packaging.component.html',
})
export class PartPackagingComponent {
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

  private readonly packagingService = inject(PackagingService);
  private readonly constructionService = inject(ProductConstructionService);

  packagingsForm: FormGroup<ProductPackagingFormGroup>;

  packagingQuery = injectQuery(() => ({
    queryKey: ['partPackaging', this.id$()],
    queryFn: async (): Promise<[PackagingDto, number][]> => {
      const packagings = await this.packagingService.getPartPackagings(
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
      this.packagingService.updatePartPackagigns(dto, this.id$() ?? ''),
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
