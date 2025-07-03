/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { CriticalAssumptionForm } from '../overview/impact.form';

export const criticalAssumptionsFormArrayGroup =
  (): FormArray<CriticalAssumptionForm> =>
    new FormArray<CriticalAssumptionForm>([criticalAssumptionFormGroup()]);

export const criticalAssumptionFormGroup = () =>
  new FormGroup<{
    id: FormControl<string | null>;
    title: FormControl<string>;
    sourceInformation: FormControl<string>;
    degreeOfUncertainty: FormControl<string>;
  }>({
    id: new FormControl<string | null>(''),
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),

    sourceInformation: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    degreeOfUncertainty: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

export const addCriticalAssumptionFormGroup = (
  assumptions: FormArray<CriticalAssumptionForm>
) => {
  assumptions.push(criticalAssumptionFormGroup());
};

export const removeCriticalAssumptionFormGroup = (
  assumptions: FormArray<CriticalAssumptionForm>,
  index: number
) => {
  assumptions.removeAt(index);
};
