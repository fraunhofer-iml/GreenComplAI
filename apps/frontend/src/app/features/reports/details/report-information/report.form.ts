/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormControl } from '@angular/forms';

export type ReportForm = {
  id: FormControl<string | null>;
  assetsBusinessActivitiesEvaluated: FormControl<boolean | null>;
  evaluationMethodsAssumptionsTools: FormControl<string | null>;
  consultationsConducted: FormControl<boolean | null>;
  consultationMethods: FormControl<string | null>;
  conceptInformationResources: FormControl<string | null>;
  sustainableProcurementImpact: FormControl<string | null>;
  isFinalReport: FormControl<boolean | null>;
  evaluationYear: FormControl<Date | null>;
};
