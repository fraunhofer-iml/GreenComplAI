/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { StrategyForm } from './strategy.form';

export const strategiesFormArrayGroup = () =>
  new FormGroup<{
    strategies: FormArray<StrategyForm>;
  }>({
    strategies: new FormArray<
      FormGroup<{
        id: FormControl<string | null>;
        name: FormControl<string>;
        conceptInformationResources: FormControl<string>;
        resourceImpactAndRecycling: FormControl<string>;
        sustainableProcurementImpact: FormControl<string>;
      }>
    >([strategyFormGroup()]),
  });

export const strategyFormGroup = () =>
  new FormGroup<{
    id: FormControl<string | null>;
    name: FormControl<string>;
    conceptInformationResources: FormControl<string>;
    resourceImpactAndRecycling: FormControl<string>;
    sustainableProcurementImpact: FormControl<string>;
  }>({
    id: new FormControl<string | null>(null),
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    conceptInformationResources: new FormControl<string>('', {
      nonNullable: true,
    }),
    resourceImpactAndRecycling: new FormControl<string>('', {
      nonNullable: true,
    }),
    sustainableProcurementImpact: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

export const addStrategyFormGroup = (
  form: FormGroup<{
    strategies: FormArray<StrategyForm>;
  }>
) => {
  form.controls.strategies.push(strategyFormGroup());
};

export const removeStrategyGroup = (
  form: FormGroup<{
    strategies: FormArray<StrategyForm>;
  }>,
  index: number
) => {
  form.controls.strategies.removeAt(index);
};
