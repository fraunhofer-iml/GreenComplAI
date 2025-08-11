/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { GoalPlanningFormGroup } from './forms/goal-planning.form';
import { GoalForm } from './forms/goal.forms';

export const addValidatorsToFormGroup = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((controlName) => {
    const control = formGroup.get(controlName);
    if (control) {
      addValidatorRecursively(control);
    }
  });
};

export const addValidatorRecursively = (control: AbstractControl) => {
  if (control instanceof FormControl) {
    control.setValidators(Validators.required);
    control.updateValueAndValidity();
    control.markAsTouched();
  } else if (control instanceof FormGroup || control instanceof FormArray) {
    Object.values(control.controls).forEach((childControl) => {
      addValidatorRecursively(childControl);
    });
  }
};

export const removeValidatorsFromOptionalFields = (
  formGroup: FormGroup<GoalPlanningFormGroup>
) => {
  const controls: FormControl[] = [];

  if (!formGroup.value.goalsPlanned) {
    controls.push(
      formGroup.controls.deadline.controls.from,
      formGroup.controls.deadline.controls.to
    );
  } else {
    controls.push(formGroup.controls.noGoalsExplanation);
  }

  if (!formGroup.value.goalsTracked) {
    controls.push(
      formGroup.controls.referencePeriodForProgression.controls.from,
      formGroup.controls.referencePeriodForProgression.controls.to,
      formGroup.controls.followUpProcedure,
      formGroup.controls.progression,
      formGroup.controls.targets
    );
  }

  removeValidator(controls);
};

export const removeOptionalGoalValidators = (goalForm: GoalForm) => {
  const controls: FormControl[] = [];

  if (!goalForm.value.stakeholderInclusion) {
    controls.push(goalForm.controls.stakeholderInclusionComment);
  }

  if (!goalForm.value.hasEcologicalImpact) {
    controls.push(
      ...[
        goalForm.controls.ecologicalThresholdDescription,
        goalForm.controls.ecologicalThresholdDetermination,
        goalForm.controls.ecologicalThresholdResponsibilities,
      ]
    );
  }

  removeValidator(controls);
};

export const removeValidator = (controls: FormControl[]) => {
  controls.forEach((control) => {
    control.removeValidators(Validators.required);
    control.updateValueAndValidity();
  });
};
