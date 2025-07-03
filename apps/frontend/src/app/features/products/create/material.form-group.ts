/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

export const materialFormArrayGroup = () =>
  new FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>({
    materials: new FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >([materialFormGroup()]),
  });

export const materialFormGroup = () =>
  new FormGroup<{
    material: FormControl<string>;
    percentage: FormControl<number>;
  }>({
    material: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    percentage: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
  });

export const addMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>
) => {
  form.controls.materials.push(materialFormGroup());
};

export const removeMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>,
  index: number
) => {
  form.controls.materials.removeAt(index);
  if (form.controls.materials.length < 1) addMaterialFormGroup(form);
};
