/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto, WasteCreateDto, WasteDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';

import { Component, inject, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { ConfirmUpdateDialogComponent } from '../../../../shared/components/confirm-update-dialog/confirm-update.dialog';
import { WasteCreateComponent } from '../../../../shared/components/waste-create/waste-create.component';
import { WasteFormGroup } from '../../../../shared/components/waste-create/waste-form';
import { wasteFormGroup } from '../../../../shared/components/waste-create/waste.form-group';
import { materialFormGroup } from '../../create/material.form-group';

@Component({
  selector: 'app-product-waste-update',
  imports: [WasteCreateComponent, RouterModule, MatButtonModule],
  templateUrl: './product-waste-update.component.html',
})
export class ProductWasteUpdateComponent {
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  id = input<string | null>(null);

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: WasteCreateDto) =>
      this.productsService.updateWaste(dto, this.id() ?? ''),
    onSuccess: () => this.router.navigate(['/products', this.id()]),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  productQuery = injectQuery(() => ({
    queryKey: ['products', this.id()],
    queryFn: async (): Promise<ProductDto> => {
      const product = await this.productsService.getById(this.id() ?? '');
      this.setFormData(product.waste);
      return product;
    },
    enabled: !!this.id(),
  }));

  form: FormGroup<WasteFormGroup> = wasteFormGroup();
  readonly dialog = inject(MatDialog);

  private setFormData(dto?: Partial<WasteDto>) {
    if (!dto) return;

    this.form.patchValue({
      ...dto,
      wasteMaterials: {
        materials: [],
      },
      hasHazardousWaste: !!dto.hazardousWaste,
      radioactiveAmount: dto.radioactiveAmount,
    });

    dto.wasteMaterials?.map((mat) => {
      const newForm = materialFormGroup();
      newForm.patchValue({
        material: mat.material?.name ?? '',
        percentage: mat.percentage,
      });
      this.form.controls.wasteMaterials.controls.materials.push(newForm);
    });
  }

  openDialog() {
    this.dialog
      .open(ConfirmUpdateDialogComponent, {
        data: this.productQuery.data()?.outlier,
      })
      .afterClosed()
      .subscribe(
        (result: { confirmed: boolean; fieldsToValidate: string[] }) => {
          if (result.confirmed) this.save(result.fieldsToValidate);
        },
      );
  }

  save(fieldsToValidate: string[]) {
    const dto: WasteCreateDto = {
      ...this.form.value,
      fieldsToValidate: fieldsToValidate,
      wasteMaterials:
        this.form.controls.wasteMaterials.value.materials
          ?.filter((m) => m.material && m.percentage)
          .map((m) => ({
            material: m.material ?? '',
            percentage: m.percentage ?? 0,
          })) ?? [],
    } as WasteCreateDto;

    this.updateMutation.mutate(dto);
  }
}
