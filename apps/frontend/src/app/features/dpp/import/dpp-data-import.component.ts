/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CriticalRawMaterials,
  ProductDto,
  ProductMasterDataDto,
  ProductUpdateDto,
} from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { DppService } from '../../../core/services/dpp/dpp.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { ProductDppCompareComponent } from './comparison/dpp-card.component';
import { ProductCardComponent } from './comparison/product-card.component';

@Component({
  selector: 'app-dpp-data-import',
  imports: [
    CommonModule,
    ProductDppCompareComponent,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    ProductCardComponent,
    MatButtonModule,
  ],
  providers: [DppService],
  templateUrl: './dpp-data-import.component.html',
})
export class DppDataImportComponent {
  private readonly dppService = inject(DppService);
  private readonly productService = inject(ProductsService);
  private readonly router = inject(Router);

  id = input<string>('id');

  dppQuery = injectQuery(() => ({
    queryKey: ['dpp', this.id()],
    queryFn: async (): Promise<ProductDto> =>
      this.dppService.importProductFRomDpp(this.id() ?? ''),
    enabled: !!this.id(),
  }));

  productQuery = injectQuery(() => ({
    queryKey: ['product', this.id()],
    queryFn: async (): Promise<ProductDto> =>
      this.productService.getById(this.id() ?? ''),
    enabled: !!this.id(),
  }));

  dppMaterials = computed(() => {
    console.log(this.dppQuery.data());
    const res = {
      materials: this.dppQuery
        .data()
        ?.materials?.map((mm) => `${mm[0].name}: ${mm[1]} %`),
      packagings: this.dppQuery.data()?.packagings?.map((p) => `${p[0].name}`),
      criticalRawMaterials: this.dppQuery
        .data()
        ?.criticalRawMaterials?.map((m) => `${m[0].name}: ${m[1]} `),
    };
    return res;
  });

  productMaterials = computed(() => {
    console.log(this.productQuery.data());
    const res = {
      materials: this.productQuery
        .data()
        ?.materials?.map((m) => `${m[0].name}: ${m[1]} %`),
      packagings: this.productQuery
        .data()
        ?.packagings?.map((p) => `${p[0].name}`),
      criticalRawMaterials: this.productQuery
        .data()
        ?.criticalRawMaterials?.map((m) => `${m[0].name}: ${m[1]}`),
    };
    return res;
  });

  formGroup = new FormGroup({
    name: new FormControl<boolean>(false),
    productId: new FormControl<boolean>(false),
    gtin: new FormControl<boolean>(false),
    taricCode: new FormControl<boolean>(false),
    supplier: new FormControl<boolean>(false),
    importer: new FormControl<boolean>(false),
    materials: new FormControl<boolean>(false),
    criticalRawMaterials: new FormControl<boolean>(false),
    packagings: new FormControl<boolean>(false),
    waterUsed: new FormControl<boolean>(false),
    productCarbonFootprint: new FormControl<boolean>(false),
  });

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: ProductUpdateDto) => {
      return this.productService.update(dto, this.id() ?? '');
    },
    onSuccess: () => this.router.navigate(['/products', this.id()]),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  constructor() {
    this.formGroup.valueChanges.subscribe((val) => console.log(val));
  }

  submit() {
    const data = this.dppQuery.data();
    if (!data) return;
    console.log(this.formGroup.value);
    const formValue = this.formGroup.value;

    const dto = {} as ProductUpdateDto;
    const masterData = {} as ProductMasterDataDto;

    if (formValue.name) masterData.name = data.name;

    if (formValue.taricCode) masterData.taricCode = data.taricCode;

    if (formValue.gtin) masterData.gtin = data.gtin;

    if (formValue.waterUsed) masterData.waterUsed = data.waterUsed;

    if (formValue.productId) masterData.productId = data.productId;
    if (formValue.productCarbonFootprint)
      masterData.productCarbonFootprint = data.productCarbonFootprint;

    if (formValue.supplier) {
      // TODO:  create company
    }

    if (formValue.importer) {
      masterData.importerName = data.importerName;
      masterData.importerPhone = data.importerPhone;
      masterData.importerEmail = data.importerEmail;
      masterData.importerAddress = data.importerAddress;
    }

    dto.masterData = masterData;

    if (formValue.materials)
      dto.materials = (data.materials ?? []).map((m) => ({
        material: m[0].name,
        percentage: m[1],
        primary: m[2],
        renewable: m[3],
      }));

    if (formValue.criticalRawMaterials) {
      dto.criticalRawMaterials = [];
      (data.criticalRawMaterials ?? []).forEach((m) => {
        dto.criticalRawMaterials.push({
          material: m[0].name as CriticalRawMaterials,
          percentage: m[1],
        });
      });
    }

    console.log(dto);

    this.updateMutation.mutate(dto);
  }
}
