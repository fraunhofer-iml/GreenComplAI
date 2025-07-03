/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingDto, WasteCreateDto, WasteDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { ConfirmUpdateDialogComponent } from '../../../../shared/components/confirm-update-dialog/confirm-update.dialog';
import { WasteCreateComponent } from '../../../../shared/components/waste-create/waste-create.component';
import { WasteFormGroup } from '../../../../shared/components/waste-create/waste-form';
import { wasteFormGroup } from '../../../../shared/components/waste-create/waste.form-group';
import { materialFormGroup } from '../../../products/create/material.form-group';

@Component({
  selector: 'app-waste-update',
  imports: [CommonModule, WasteCreateComponent, RouterModule, MatButtonModule],
  templateUrl: './waste-update.component.html',
})
export class WasteUpdateComponent {
  id = input<string | null>(null);

  form: FormGroup<WasteFormGroup> = wasteFormGroup();
  readonly dialog = inject(MatDialog);
  private readonly packagingService = inject(PackagingService);
  private readonly router = inject(Router);

  packagingQuery = injectQuery(() => ({
    queryKey: ['packaging', this.id()],
    queryFn: async (): Promise<PackagingDto> => {
      const res = await this.packagingService.getById(this.id() ?? '');
      this.setFormData(res.waste);
      return res;
    },
    enabled: !!this.id(),
  }));

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: WasteCreateDto) =>
      this.packagingService.updateWaste(dto, this.id() ?? ''),
    onSuccess: () => this.router.navigate(['/packaging', this.id()]),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

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
      .open(ConfirmUpdateDialogComponent)
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.save();
      });
  }

  save() {
    const dto: WasteCreateDto = {
      ...this.form.value,
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
