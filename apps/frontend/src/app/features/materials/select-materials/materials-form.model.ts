/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup } from '@angular/forms';

export interface MaterialsFormGroup {
  materials: FormArray<
    FormGroup<{
      material: FormControl<string>;
      percentage: FormControl<number>;
      renewable?: FormControl<boolean | null>;
      primary?: FormControl<boolean | null>;
    }>
  >;
}

export interface RegularMaterialsFormGroup {
  materials: FormArray<
    FormGroup<{
      material: FormControl<string>;
      percentage: FormControl<number>;
      renewable: FormControl<boolean | null>;
      primary: FormControl<boolean | null>;
    }>
  >;
}
