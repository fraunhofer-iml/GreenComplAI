/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpactType } from '@ap2/api-interfaces';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

export type FinancialImpactForm = FormGroup<{
  id: FormControl<string | null>;
  title: FormControl<string>;
  type: FormControl<ImpactType>;
  description: FormControl<string>;
  financialImpactMin: FormControl<number>;
  financialImpactMax: FormControl<number>;
  descriptionFinancialEffects: FormControl<string>;
  criticalAssumptions: FormArray<CriticalAssumptionForm>;
}>;

export type CriticalAssumptionForm = FormGroup<{
  id: FormControl<string | null>;
  title: FormControl<string>;
  sourceInformation: FormControl<string>;
  degreeOfUncertainty: FormControl<string>;
}>;
