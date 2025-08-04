/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  CRITICAL_RAW_MATERIAL,
  RARE_EARTHS,
} from '../../../shared/constants/inflows';
import { MaterialsFormGroup } from './materials-form.model';

@Component({
  selector: 'app-select-materials',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatAutocompleteModule,
  ],
  templateUrl: './select-materials.component.html',
})
export class SelectMaterialsComponent {
  @Input() form?: FormGroup<MaterialsFormGroup>;
  @Input() rareEarthsForm?: FormGroup<MaterialsFormGroup>;
  @Input() criticalRawMaterialsForm?: FormGroup<MaterialsFormGroup>;

  @Output() closeSheetEvent = new EventEmitter<void>();

  @Output() addMaterialEvent = new EventEmitter<void>();
  @Output() removeMaterialEvent = new EventEmitter<number>();

  @Output() addRareEarthEvent = new EventEmitter<void>();
  @Output() removeRareEarthEvent = new EventEmitter<number>();

  @Output() addCriticalRawMaterialEvent = new EventEmitter<void>();
  @Output() removeCriticalRawMaterialEvent = new EventEmitter<number>();

  earthFilter = signal<string>('');
  criticalMaterialsFilter = signal<string>('');

  rareEarths$ = computed(() =>
    RARE_EARTHS.filter((re) => re.includes(this.earthFilter()))
  );
  criticalRawMaterials$ = computed(() =>
    CRITICAL_RAW_MATERIAL.filter((re) =>
      re.includes(this.criticalMaterialsFilter())
    )
  );

  onEarthInputChange(val: string): void {
    this.earthFilter.set(val);
  }

  onCriticalMaterialInputChange(val: string): void {
    this.criticalMaterialsFilter.set(val);
  }

  get materials() {
    return this.form?.get('materials') as FormArray;
  }
  get rareEarths() {
    return this.rareEarthsForm?.get('materials') as FormArray;
  }
  get criticalMaterials() {
    return this.criticalRawMaterialsForm?.get('materials') as FormArray;
  }
}
