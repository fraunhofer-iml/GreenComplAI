/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpactType } from '@ap2/api-interfaces';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { criticalAssumptionsFormArrayGroup } from '../update/criticalAssumptions.form-group';
import { CriticalAssumptionForm, FinancialImpactForm } from './impact.form';

export const financialImpactsFormArrayGroup = () =>
  new FormGroup<{
    impacts: FormArray<FinancialImpactForm>;
  }>({
    impacts: new FormArray<FinancialImpactForm>([financialImpactsFormGroup()]),
  });

export const financialImpactsFormGroup = () =>
  new FormGroup<{
    id: FormControl<string | null>;
    title: FormControl<string>;
    type: FormControl<ImpactType>;
    description: FormControl<string>;
    financialImpactMin: FormControl<number>;
    financialImpactMax: FormControl<number>;
    descriptionFinancialEffects: FormControl<string>;
    criticalAssumptions: FormArray<CriticalAssumptionForm>;
  }>({
    id: new FormControl<string | null>(''),
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    type: new FormControl<ImpactType>(ImpactType.RISK, {
      nonNullable: true,
      validators: Validators.required,
    }),
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    financialImpactMin: new FormControl<number>(0, {
      nonNullable: true,
      validators: Validators.required,
    }),
    financialImpactMax: new FormControl<number>(0, {
      nonNullable: true,
      validators: Validators.required,
    }),
    descriptionFinancialEffects: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    criticalAssumptions: criticalAssumptionsFormArrayGroup(),
  });

export const addFinancialImpactsFormGroup = (
  form: FormGroup<{
    impacts: FormArray<FinancialImpactForm>;
  }>
) => {
  form.controls.impacts.push(financialImpactsFormGroup());
};

export const removeFinancialImpactsFormGroup = (
  form: FormGroup<{
    impacts: FormArray<FinancialImpactForm>;
  }>,
  index: number
) => {
  form.controls.impacts.removeAt(index);
};
