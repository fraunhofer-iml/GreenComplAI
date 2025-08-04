/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingDto } from '@ap2/api-interfaces';
import { Component, input, Input, OnChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ProductPackagingFormGroup } from '../../../features/products/create/model/product-form.model';
import { PackagingSheetComponent } from '../sheet/packaging-sheet/packaging-sheet.component';

@Component({
  selector: 'app-packaging-selection',
  imports: [
    PackagingSheetComponent,
    MatIconModule,
    MatChipsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
  ],
  templateUrl: './packaging-selection.component.html',
})
export class PackagingSelectionComponent implements OnChanges {
  selectedPackagings: [PackagingDto, number][] = [];

  @Input() title?: string;

  packagingsForm = input.required<FormGroup<ProductPackagingFormGroup>>();

  ngOnChanges(): void {
    this.packagingsForm().controls.packagings.valueChanges.subscribe((val) => {
      this.selectedPackagings = val;
    });
  }
}
