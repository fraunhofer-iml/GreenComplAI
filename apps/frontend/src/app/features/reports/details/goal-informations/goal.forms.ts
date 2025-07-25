/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup } from '@angular/forms';

export type goalForm = FormGroup<{
    title: FormControl<string | null>;
    obligation: FormControl<string | null>;
    target: FormControl<string | null>;
    isRelative: FormControl<boolean | null>;
    scope: FormControl<string | null>;
    action: FormControl<string | null>;
    unit: FormControl<string | null>;
    geographicScope: FormControl<string | null>;
    methodsAndAssumptions: FormControl<string | null>;
    referenceValue: FormControl<string | null>;
    referenceDate: FormControl<Date | null>;
    isScientificReferenced: FormControl<boolean | null>;
    stakeholderInclusion: FormControl<boolean | null>;
    changeOfGoalsOrMethods: FormControl<string | null>;
    effortsAndMonitoring: FormControl<string | null>;
    impactOnExtensionOfCircularityProductDesign: FormControl<string | null>;
    impactOnCircularityMaterialRate: FormControl<string | null>;
    impactOnMinimizingOfPrimaryMaterialUse: FormControl<string | null>;
    impactOnSustainableSourcing: FormControl<string | null>;
    impactOnWasteManagement: FormControl<string | null>;
    impactOnMiscellaneous: FormControl<string | null>;
    wasteHLevel: FormControl<string | null>;
    stakeholderInclusionComment: FormControl<string | null>;
    hasEcologicalImpact: FormControl<boolean | null>;
    ecologicalThresholdDescription: FormControl<string | null>;
    ecologicalThresholdDetermination: FormControl<string | null>;
    ecologicalThresholdResponsibilities: FormControl<string | null>;
    validDate: FormGroup<{
      from: FormControl<Date | null>;
      to: FormControl<Date | null>;
    }>;
    strategies: FormArray<
      FormGroup<{
        strategy: FormControl<string | null>;
        connection: FormControl<string | null>;
      }>
    >;
  }>;

export const newGoalForm = () => new FormGroup({
  title: new FormControl<string | null>(null),
  ecologicalThresholdResponsibilities: new FormControl<string | null>(null),
  ecologicalThresholdDescription: new FormControl<string | null>(null),
  ecologicalThresholdDetermination: new FormControl<string | null>(null),
  hasEcologicalImpact: new FormControl<boolean | null>(false),
  wasteHLevel: new FormControl<string | null>("avoidance"),
  impactOnExtensionOfCircularityProductDesign: new FormControl<string | null>(null),
  impactOnCircularityMaterialRate: new FormControl<string | null>(null),
  impactOnMinimizingOfPrimaryMaterialUse: new FormControl<string | null>(null),
  impactOnMiscellaneous: new FormControl<string | null>(null),
  impactOnSustainableSourcing: new FormControl<string | null>(null),
  impactOnWasteManagement: new FormControl<string | null>(null),
  obligation: new FormControl<string | null>(null),
  target: new FormControl<string | null>(null),
  isRelative: new FormControl<boolean | null>(false),
  scope: new FormControl<string | null>(null),
  action: new FormControl<string | null>(null),
  geographicScope: new FormControl<string | null>(null),
  unit: new FormControl<string | null>(null),
  methodsAndAssumptions: new FormControl<string | null>(null),
  referenceValue: new FormControl<string | null>(null),
  referenceDate: new FormControl<Date | null>(null),
  isScientificReferenced: new FormControl<boolean | null>(false),
  stakeholderInclusion: new FormControl<boolean | null>(false),
  changeOfGoalsOrMethods: new FormControl<string | null>(null),
  effortsAndMonitoring: new FormControl<string | null>(null),
  stakeholderInclusionComment: new FormControl<string | null>(null),
  validDate: new FormGroup({
    from: new FormControl<Date | null>(null),
    to: new FormControl<Date | null>(null),
  }),
  strategies: new FormArray<
    FormGroup<{
      strategy: FormControl<string | null>;
      connection: FormControl<string | null>;
    }>
  >([]),
});
