/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormControl, FormGroup } from '@angular/forms';
import { RegularMaterialsFormGroup } from '../../../features/materials/select-materials/materials-form.model';

export interface WasteFormGroup {
  wasteMaterials: FormGroup<RegularMaterialsFormGroup>;
  radioactiveAmount: FormControl<number | null>;
  recycledWastePercentage: FormControl<number | null>;
  normalWaste: FormGroup<GeneralWasteFormGroup>;
  hasHazardousWaste: FormControl<boolean>;
  hazardousWaste: FormGroup<GeneralWasteFormGroup>;
}

export interface GeneralWasteFormGroup {
  nonUtilizableWaste: FormGroup<NonUtilizableWasteFormGroup>;
  utilizableWaste: FormGroup<UtilizableWasteFormGroup>;
  hazardousWasteType?: FormControl<string | null>;
}

export interface UtilizableWasteFormGroup {
  preparationForRecyclingWeight: FormControl<number>;
  recyclingWeight: FormControl<number>;
  miscellaneousWeight: FormControl<number>;
}

export interface NonUtilizableWasteFormGroup {
  landfillWeight: FormControl<number>;
  combustionWeight: FormControl<number>;
  miscellaneousWeight: FormControl<number>;
}
