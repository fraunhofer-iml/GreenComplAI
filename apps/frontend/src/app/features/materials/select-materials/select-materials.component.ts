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
import { MatSelectModule } from '@angular/material/select';

import {
  MaterialsFormGroup,
  RegularMaterialsFormGroup,
} from './materials-form.model';
import { CRITICAL_RAW_MATERIALS, RARE_EARTHS } from '@ap2/api-interfaces';

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
    MatSelectModule,
  ],
  templateUrl: './select-materials.component.html',
})
export class SelectMaterialsComponent {
  @Input() materialsForm?: FormGroup<RegularMaterialsFormGroup>;
  @Input() basicForm?: FormGroup<MaterialsFormGroup>;
  @Input() rareEarthsForm?: FormGroup<MaterialsFormGroup>;
  @Input() criticalRawMaterialsForm?: FormGroup<MaterialsFormGroup>;
  @Input() isWateMaterial = false;

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
    CRITICAL_RAW_MATERIALS.filter((re) =>
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
    return this.materialsForm?.get('materials') as FormArray;
  }
  get rareEarths() {
    return this.rareEarthsForm?.get('materials') as FormArray;
  }
  get criticalMaterials() {
    return this.criticalRawMaterialsForm?.get('materials') as FormArray;
  }
}
