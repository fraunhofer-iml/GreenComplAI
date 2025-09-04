/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto, ProductUpdateDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { Component, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../../core/services/authentication/authentication.service';
import { ProductsService } from '../../../../core/services/products/products.service';
import { SupplierService } from '../../../../core/services/suppliers/suppliers.service';
import { ConfirmUpdateDialogComponent } from '../../../../shared/components/confirm-update-dialog/confirm-update.dialog';
import { ProductMasterDataFormComponent } from '../../../../shared/components/product-master-data-form/product-master-data-form.component';
import { autocompleteValidator } from '../../../../shared/utils/autocomplete.validator';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import {
  materialFormArrayGroup,
  materialFormGroup,
  regularMaterialFormArrayGroup,
  regularMaterialFormGroup,
} from '../../create/material.form-group';
import { MasterDataFormGroup } from '../../create/model/product-form.model';
import { masterDataFormGroup } from '../../create/product.form-group';

@Component({
  selector: 'app-product-update',
  imports: [
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

  private readonly productsService = inject(ProductsService);
  private readonly supplierService = inject(SupplierService);
  private readonly constructionService = inject(ProductConstructionService);
  private readonly router = inject(Router);
  authService = inject(AuthenticationService);

  productQuery = injectQuery(() => ({
    queryKey: ['products', this.id()],
    queryFn: async (): Promise<Partial<ProductDto>> => {
      let product = undefined;
      if (this.authService.isSupplier()) {
        product = await this.supplierService.getById(this.id() ?? '');
      } else {
        product = await this.productsService.getById(this.id() ?? '');
      }
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
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
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
    mutationFn: (dto: ProductUpdateDto) => {
      if (this.authService.isSupplier()) {
        return this.supplierService.update(dto, this.id() ?? '');
      }

      return this.productsService.update(dto, this.id() ?? '');
    },
    onSuccess: () => this.router.navigate(['/products', this.id()]),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  constructor() {
    this.form = masterDataFormGroup();
    this.materialsForm = regularMaterialFormArrayGroup();
    this.rareEarthsForm = materialFormArrayGroup();
    this.criticalRawMaterialsForm = materialFormArrayGroup();
  }

  setFormData(dto: Partial<ProductDto>) {
    // Check if supplier is the same as importer (when importer fields are populated from supplier)
    const supplierIsImporter =
      !dto.importerName || dto.importerName === dto.supplier?.name;

    this.form.patchValue({
      ...dto,
      variant: undefined,
      supplierIsImporter: supplierIsImporter,
    });

    // Set importer field state based on supplierIsImporter
    if (supplierIsImporter) {
      if (dto.supplier) {
        this.form.controls.importerName.patchValue(dto.supplier.name);
        this.form.controls.importerEmail.patchValue(dto.supplier.email);
        this.form.controls.importerPhone.patchValue(dto.supplier.phone);
        this.form.controls.importerAddress.patchValue(
          dto.supplier.addresses?.[0]
            ? `${dto.supplier.addresses[0].street}, ${dto.supplier.addresses[0].postalCode} ${dto.supplier.addresses[0].city}, ${dto.supplier.addresses[0].country}`
            : ''
        );
      }
      this.form.controls.importerName.disable();
      this.form.controls.importerEmail.disable();
      this.form.controls.importerPhone.disable();
      this.form.controls.importerAddress.disable();
    } else {
      this.form.controls.importerName.patchValue(dto.importerName || '');
      this.form.controls.importerEmail.patchValue(dto.importerEmail || '');
      this.form.controls.importerPhone.patchValue(dto.importerPhone || '');
      this.form.controls.importerAddress.patchValue(dto.importerAddress || '');
      this.form.controls.importerName.enable();
      this.form.controls.importerEmail.enable();
      this.form.controls.importerPhone.enable();
      this.form.controls.importerAddress.enable();
      this.form.controls.importerName.setValidators([Validators.required]);
      this.form.controls.importerEmail.setValidators([Validators.email]);
      this.form.controls.importerPhone.setValidators([]);
      this.form.controls.importerAddress.setValidators([]);
    }
    this.form.controls.importerName.updateValueAndValidity();
    this.form.controls.importerEmail.updateValueAndValidity();
    this.form.controls.importerPhone.updateValueAndValidity();
    this.form.controls.importerAddress.updateValueAndValidity();

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

    dto.materials?.map((material) => {
      const newForm = regularMaterialFormGroup();
      newForm.patchValue({
        material: material[0].name,
        percentage: material[1],
        renewable: material[2],
        primary: material[3],
      });
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

    console.log(dto);

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
