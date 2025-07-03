/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  GeneralWasteFormGroup,
  NonUtilizableWasteFormGroup,
  UtilizableWasteFormGroup,
  WasteFormGroup,
} from './waste-form';

export const wasteFormGroup = () => {
  return new FormGroup<WasteFormGroup>({
    wasteMaterials: new FormGroup({
      materials: new FormArray(
        [
          new FormGroup({
            material: new FormControl<string>('', {
              nonNullable: true,
              validators: [Validators.required],
            }),
            percentage: new FormControl<number>(0, {
              nonNullable: true,
              validators: [Validators.required, Validators.min(0)],
            }),
          }),
        ],
        Validators.required
      ),
    }),
    radioactiveAmount: new FormControl<number | null>(
      null,
      Validators.required
    ),
    recycledWastePercentage: new FormControl<number | null>(
      null,
      Validators.required
    ),
    normalWaste: normalWasteFormGroup(),
    hasHazardousWaste: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    hazardousWaste: hazardousWasteFormGroup(),
  });
};

const normalWasteFormGroup = () => {
  return new FormGroup<GeneralWasteFormGroup>({
    nonUtilizableWaste: nonUtilizableWasteFormGroup(),
    utilizableWaste: utilizableWasteFormGroup(),
  });
};

const hazardousWasteFormGroup = () => {
  return new FormGroup<GeneralWasteFormGroup>({
    nonUtilizableWaste: nonUtilizableWasteFormGroup(),
    utilizableWaste: utilizableWasteFormGroup(),
    hazardousWasteType: new FormControl<string | null>(null),
  });
};

const utilizableWasteFormGroup = () =>
  new FormGroup<UtilizableWasteFormGroup>({
    preparationForRecyclingWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    recyclingWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    miscellaneousWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

const nonUtilizableWasteFormGroup = () =>
  new FormGroup<NonUtilizableWasteFormGroup>({
    landfillWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    combustionWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    miscellaneousWeight: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });
