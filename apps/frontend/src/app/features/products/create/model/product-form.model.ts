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
  PackagingDto,
  ProductDto,
  ProductGroupDto,
  VariantDto,
} from '@ap2/api-interfaces';
import { FormArray, FormControl, FormGroup } from '@angular/forms';

export interface BillOfMaterialFormGroup {
  billOfMaterialDescription: FormControl<string | null>;
  billOfMaterial: FormControl<[ProductDto, number][]>;
}

export interface MasterDataFormGroup {
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  productId: FormControl<string | null>;
  category: FormControl<string | null>;
  isSellable: FormControl<boolean | null>;
  weight: FormControl<number | null>;
  unit: FormControl<string | null>;
  price: FormControl<number | null>;
  dimensions: FormControl<string | null>;
  percentageOfBiologicalMaterials: FormControl<number | null>;
  supplier: FormControl<CompanyDto | string | null>;
  supplierIsImporter: FormControl<boolean | null>;
  importerName: FormControl<string | null>;
  importerEmail: FormControl<string | null>;
  importerPhone: FormControl<string | null>;
  importerAddress: FormControl<string | null>;
  manufacturer: FormControl<CompanyDto | string | null>;
  productGroup: FormControl<ProductGroupDto | string | null>;
  variant: FormControl<VariantDto | null>;
  productionLocation: FormControl<AddressDto | null>;
  warehouseLocation: FormControl<AddressDto | null>;
  wasteFlow: FormControl<string | null>;
  waterUsed: FormControl<number | null>;
  cascadePrinciple: FormControl<string | null>;
  certification: FormControl<string | null>;
  durability: FormControl<number | null>;
  durabilityDifference: FormControl<number | null>;
  reparability: FormControl<number | null>;
  circularPrinciple: FormControl<boolean | null>;
  circularPrincipleJustification: FormControl<string | null>;
  circularPrincipleMeasureable: FormControl<boolean | null>;
  circularPrincipleAssumption: FormControl<string | null>;
  digitalProductPassportUrl: FormControl<string | null>;
  taricCode: FormControl<string | null>;
  gtin: FormControl<string | null>;
}

export interface ProducedItemsFormGroup {
  producedItems: FormArray<
    FormGroup<{
      amount: FormControl<number | null>;
      year: FormControl<Date | null>;
    }>
  >;
}

export interface ProductPackagingFormGroup {
  packagings: FormControl<[PackagingDto, number][]>;
}
