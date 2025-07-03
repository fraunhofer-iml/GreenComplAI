/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SelectMaterialsComponent } from '../../../features/materials/select-materials/select-materials.component';
import {
  addMaterialFormGroup,
  removeMaterialFormGroup,
} from '../../../features/products/create/material.form-group';
import { BaseSheetComponent } from '../sheet/base/sheet.component';
import { WasteFormGroup } from './waste-form';

@Component({
  selector: 'app-waste-create',
  imports: [
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    FormsModule,
    BaseSheetComponent,
    SelectMaterialsComponent,
    MatIconButton,
    MatCheckboxModule,
  ],
  templateUrl: './waste-create.component.html',
})
export class WasteCreateComponent {
  @Input()
  waste!: FormGroup<WasteFormGroup>;

  protected readonly addMaterialFormGroup = addMaterialFormGroup;
  protected readonly removeMaterialFormGroup = removeMaterialFormGroup;
}
