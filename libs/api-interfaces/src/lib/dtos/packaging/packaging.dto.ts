/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyDto } from '../companies';
import { MaterialDto } from '../material';
import { ProductDto } from '../products';
import { WasteDto } from '../waste';

export class PackagingDto {
  id: string;
  name: string;
  weight: number;
  percentageOfRenewableMaterial: number;
  percentageOfRecycledMaterial: number;
  percentageOfRStrategies: number;
  supplier: CompanyDto;
  material: MaterialDto;
  flags: string[];
  products?: ProductDto[];
  waste?: Partial<WasteDto>;
  supplierName?: string;

  constructor(
    id: string,
    name: string,
    weight: number,
    percentageOfRenewableMaterial: number,
    percentageOfRecycledMaterial: number,
    percentageOfRStrategies: number,
    supplier: CompanyDto,
    material: MaterialDto,
    flags: string[],
    waste?: WasteDto,
    products?: ProductDto[],
    supplierName?: string
  ) {
    this.id = id;
    this.name = name;
    this.weight = weight;
    this.percentageOfRenewableMaterial = percentageOfRenewableMaterial;
    this.percentageOfRecycledMaterial = percentageOfRecycledMaterial;
    this.percentageOfRStrategies = percentageOfRStrategies;
    this.supplier = supplier;
    this.material = material;
    this.products = products;
    this.waste = waste;
    this.supplierName = supplierName;
    this.material = material;
    this.flags = flags;
  }
}
