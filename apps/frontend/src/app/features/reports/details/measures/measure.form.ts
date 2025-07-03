/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasureStatus, StrategyDto } from '@ap2/api-interfaces';
import { FormControl, FormGroup } from '@angular/forms';

export type MeasureForm = FormGroup<{
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
}>;
