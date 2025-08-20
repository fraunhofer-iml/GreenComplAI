/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormControl, FormGroup } from '@angular/forms';

export type GoalPlanningFormGroup = {
  followUpProcedure: FormControl<string | null>;
  targets: FormControl<string | null>;
  progression: FormControl<string | null>;
  referencePeriodForProgression: FormGroup<{
    from: FormControl<Date | null>;
    to: FormControl<Date | null>;
  }>;
  deadline: FormGroup<{
    from: FormControl<Date | null>;
    to: FormControl<Date | null>;
  }>;
  goalsPlanned: FormControl<boolean | null>;
  goalsTracked: FormControl<boolean | null>;
  noGoalsExplanation: FormControl<string | null>;
};

export const newGoalPlanningFormGroup = (isFinal: boolean) => {
  return new FormGroup<GoalPlanningFormGroup>({
    followUpProcedure: new FormControl<string | null>(null),
    targets: new FormControl<string | null>(null),
    progression: new FormControl<string | null>(null),
    referencePeriodForProgression: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    deadline: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    goalsPlanned: new FormControl<boolean | null>({
      value: null,
      disabled: isFinal,
    }),
    goalsTracked: new FormControl<boolean | null>({
      value: false,
      disabled: isFinal,
    }),
    noGoalsExplanation: new FormControl<string | null>({
      value: null,
      disabled: isFinal,
    }),
  });
};
