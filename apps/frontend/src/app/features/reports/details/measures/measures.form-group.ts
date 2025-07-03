/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasureStatus } from '@ap2/api-interfaces';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MeasureForm } from './measure.form';

export const measuresFormArrayGroup = () =>
  new FormGroup<{
    measures: FormArray<MeasureForm>;
  }>({
    measures: new FormArray<
      FormGroup<{
        id: FormControl<string | null>;
        title: FormControl<string>;
        status: FormControl<MeasureStatus>;
        expectedResult: FormControl<string>;
        contributionAchievingStrategy: FormControl<string>;
        plannedCompletion: FormControl<Date>;
        impactOnValueChainAndStakeholders: FormControl<string>;

        contributionIncreasedResourceEfficiency: FormControl<string | null>;
        contributionHigherUtilizationRateOfSecondaryMaterials: FormControl<
          string | null
        >;
        contributionCircularDesignToDurabilityAndRStrategies: FormControl<
          string | null
        >;
        applicationOfCircularBusinessPractices: FormControl<string | null>;
        measuresAndOptimizationInContextOfWaste: FormControl<string | null>;
        progressQuantitative: FormControl<number | null>;
        progressQualitative: FormControl<string | null>;

        strategies: FormControl<string[]>;
      }>
    >([measureFormGroup()]),
  });

export const measureFormGroup = () =>
  new FormGroup<{
    id: FormControl<string | null>;
    title: FormControl<string>;
    status: FormControl<MeasureStatus>;
    expectedResult: FormControl<string>;
    contributionAchievingStrategy: FormControl<string>;
    plannedCompletion: FormControl<Date>;
    impactOnValueChainAndStakeholders: FormControl<string>;

    contributionIncreasedResourceEfficiency: FormControl<string | null>;
    contributionHigherUtilizationRateOfSecondaryMaterials: FormControl<
      string | null
    >;
    contributionCircularDesignToDurabilityAndRStrategies: FormControl<
      string | null
    >;
    applicationOfCircularBusinessPractices: FormControl<string | null>;
    measuresAndOptimizationInContextOfWaste: FormControl<string | null>;
    progressQuantitative: FormControl<number | null>;
    progressQualitative: FormControl<string | null>;

    strategies: FormControl<string[]>;
  }>({
    id: new FormControl<string | null>(''),
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    status: new FormControl<MeasureStatus>(MeasureStatus.PLANNED, {
      nonNullable: true,
      validators: Validators.required,
    }),
    expectedResult: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    contributionAchievingStrategy: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    plannedCompletion: new FormControl<Date>(new Date(), {
      nonNullable: true,
      validators: Validators.required,
    }),
    impactOnValueChainAndStakeholders: new FormControl<string>('', {
      nonNullable: true,
      validators: Validators.required,
    }),

    contributionIncreasedResourceEfficiency: new FormControl<string | null>(
      null
    ),
    contributionHigherUtilizationRateOfSecondaryMaterials: new FormControl<
      string | null
    >(null),
    contributionCircularDesignToDurabilityAndRStrategies: new FormControl<
      string | null
    >(null),
    applicationOfCircularBusinessPractices: new FormControl<string | null>(
      null
    ),
    measuresAndOptimizationInContextOfWaste: new FormControl<string | null>(
      null
    ),
    progressQualitative: new FormControl<string | null>(null),
    progressQuantitative: new FormControl<number | null>(null),

    strategies: new FormControl<string[]>([], {
      nonNullable: true,
    }),
  });

export const addMeasureFormGroup = (
  form: FormGroup<{
    measures: FormArray<MeasureForm>;
  }>
) => {
  form.controls.measures.push(measureFormGroup());
};

export const removeMeasureGroup = (
  form: FormGroup<{
    measures: FormArray<MeasureForm>;
  }>,
  index: number
) => {
  form.controls.measures.removeAt(index);
};
