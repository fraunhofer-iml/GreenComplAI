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
        renewable?: FormControl<boolean | null>;
        primary?: FormControl<boolean | null>;
      }>
    >;
  }>({
    materials: new FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable?: FormControl<boolean | null>;
        primary?: FormControl<boolean | null>;
      }>
    >([materialFormGroup()]),
  });

export const regularMaterialFormArrayGroup = () =>
  new FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
      }>
    >;
  }>({
    materials: new FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
      }>
    >([regularMaterialFormGroup()]),
  });

export const materialFormGroup = () =>
  new FormGroup<{
    material: FormControl<string>;
    percentage: FormControl<number>;
    renewable?: FormControl<boolean | null>;
  }>({
    material: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    percentage: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    renewable: new FormControl<boolean | null>(null),
  });

export const basicMaterialFormGroup = () =>
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

export const regularMaterialFormGroup = () =>
  new FormGroup<{
    material: FormControl<string>;
    percentage: FormControl<number>;
    renewable: FormControl<boolean | null>;
    primary: FormControl<boolean | null>;
  }>({
    material: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    percentage: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
    renewable: new FormControl<boolean | null>(null),
    primary: new FormControl<boolean | null>(null),
  });

export const addMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable?: FormControl<boolean | null>;
      }>
    >;
  }>
) => {
  form.controls.materials.push(materialFormGroup());
};

export const addBasicMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>
) => {
  form.controls.materials.push(basicMaterialFormGroup());
};

export const addRegularMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
      }>
    >;
  }>
) => {
  form.controls.materials.push(regularMaterialFormGroup());
};

export const removeMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable?: FormControl<boolean | null>;
      }>
    >;
  }>,
  index: number
) => {
  form.controls.materials.removeAt(index);
  if (form.controls.materials.length < 1) addMaterialFormGroup(form);
};

export const removeBasicMaterialFormGroup = (
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

export const removeRegularMaterialFormGroup = (
  form: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
      }>
    >;
  }>,
  index: number
) => {
  form.controls.materials.removeAt(index);
  if (form.controls.materials.length < 1) addRegularMaterialFormGroup(form);
};
