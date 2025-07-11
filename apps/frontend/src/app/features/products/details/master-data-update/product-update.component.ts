/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto, ProductUpdateDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { ConfirmUpdateDialogComponent } from '../../../../shared/components/confirm-update-dialog/confirm-update.dialog';
import { ProductMasterDataFormComponent } from '../../../../shared/components/product-master-data-form/product-master-data-form.component';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import {
  materialFormArrayGroup,
  materialFormGroup,
} from '../../create/material.form-group';
import { MasterDataFormGroup } from '../../create/model/product-form.model';
import { masterDataFormGroup } from '../../create/product.form-group';

@Component({
  selector: 'app-product-update',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ProductMasterDataFormComponent,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './product-update.component.html',
})
export class ProductUpdateComponent {
  id = input<string | null>(null);

  productService = inject(ProductsService);

  productQuery = injectQuery(() => ({
    queryKey: ['products', this.id()],
    queryFn: async (): Promise<ProductDto> => {
      const product = await this.productService.getById(this.id() ?? '');
      this.setFormData(product);
      return product;
    },
    enabled: !!this.id(),
  }));

  form: FormGroup<MasterDataFormGroup>;
  materialsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>;
  rareEarthsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>;
  criticalRawMaterialsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>;

  readonly dialog = inject(MatDialog);

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: ProductUpdateDto) =>
      this.productsService.update(dto, this.id() ?? ''),
    onSuccess: () => this.router.navigate(['/products', this.id()]),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  constructor(
    public readonly productsService: ProductsService,
    private readonly constructionService: ProductConstructionService,
    private readonly router: Router
  ) {
    this.form = masterDataFormGroup();
    this.materialsForm = materialFormArrayGroup();
    this.rareEarthsForm = materialFormArrayGroup();
    this.criticalRawMaterialsForm = materialFormArrayGroup();
  }

  setFormData(dto: ProductDto) {
    this.form.patchValue({
      ...dto,
      variant: undefined,
    });

    this.rareEarthsForm.controls.materials.clear();
    this.materialsForm.controls.materials.clear();
    this.criticalRawMaterialsForm.controls.materials.clear();

    dto.rareEarths?.map((earth) => {
      const newForm = materialFormGroup();
      newForm.patchValue({ material: earth[0].name, percentage: earth[1] });
      this.rareEarthsForm.controls.materials.push(newForm);
    });

    dto.criticalRawMaterials?.map((earth) => {
      const newForm = materialFormGroup();
      newForm.patchValue({ material: earth[0].name, percentage: earth[1] });
      this.criticalRawMaterialsForm.controls.materials.push(newForm);
    });

    dto.materials?.map((earth) => {
      const newForm = materialFormGroup();
      newForm.patchValue({ material: earth[0].name, percentage: earth[1] });
      this.materialsForm.controls.materials.push(newForm);
    });
  }

  save() {
    const dto: ProductUpdateDto = this.constructionService.createUpdateDto(
      this.form,
      this.materialsForm,
      this.criticalRawMaterialsForm,
      this.rareEarthsForm
    );

    this.updateMutation.mutate(dto);
  }

  openDialog() {
    this.dialog
      .open(ConfirmUpdateDialogComponent)
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.save();
      });
  }
}
