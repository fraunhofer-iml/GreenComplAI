/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormControl, FormGroup } from '@angular/forms';

export type StrategyForm = FormGroup<{
  id: FormControl<string | null>;
  name: FormControl<string>;
  conceptInformationResources: FormControl<string>;
  resourceImpactAndRecycling: FormControl<string>;
  sustainableProcurementImpact: FormControl<string>;
}>;
