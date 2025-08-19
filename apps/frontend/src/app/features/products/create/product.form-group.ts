/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AddressDto,
  CompanyDto,
  ProductGroupDto,
  VariantDto,
} from '@ap2/api-interfaces';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { autocompleteValidator } from '../../../shared/utils/autocomplete.validator';
import { MasterDataFormGroup } from './model/product-form.model';

export const masterDataFormGroup = () =>
  new FormGroup<MasterDataFormGroup>({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('', Validators.required),
    productId: new FormControl<string>('', Validators.required),
    category: new FormControl<string>('', Validators.required),
    isSellable: new FormControl<boolean | null>(false),
    weight: new FormControl<number | null>(null, Validators.required),
    unit: new FormControl<string>('', Validators.required),
    price: new FormControl<number | null>(null, Validators.required),

    dimensions: new FormControl<string | null>('', Validators.required),
    percentageOfBiologicalMaterials: new FormControl<number | null>(
      null,
      Validators.required
    ),

    supplier: new FormControl<CompanyDto | string | null>('', [
      Validators.required,
      autocompleteValidator(),
    ]),
    manufacturer: new FormControl<CompanyDto | string | null>('', [
      Validators.required,
      autocompleteValidator(),
    ]),
    productGroup: new FormControl<ProductGroupDto | string | null>('', [
      Validators.required,
      autocompleteValidator(),
    ]),
    variant: new FormControl<VariantDto | null>(null),
    productionLocation: new FormControl<AddressDto | null>(null),
    warehouseLocation: new FormControl<AddressDto | null>(null),
    wasteFlow: new FormControl<string | null>(null, Validators.required),

    waterUsed: new FormControl<number | null>(null),
    cascadePrinciple: new FormControl<string | null>(null),
    certification: new FormControl<string | null>(null),
    durability: new FormControl<number | null>(null, Validators.required),
    durabilityDifference: new FormControl<number | null>(
      null,
      Validators.required
    ),
    reparability: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
    circularPrinciple: new FormControl<boolean | null>(false),
    circularPrincipleJustification: new FormControl<string | null>(null),
    circularPrincipleMeasureable: new FormControl<boolean | null>(false),
    circularPrincipleAssumption: new FormControl<string | null>(null),
    digitalProductPassportUrl: new FormControl<string | null>(null),
  });
