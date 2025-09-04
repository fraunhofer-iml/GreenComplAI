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
  material?: MaterialDto;
  materials?: [MaterialDto, number, boolean?, boolean?][];
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
    flags: string[],
    waste?: WasteDto,
    products?: ProductDto[],
    supplierName?: string,
    materials?: [MaterialDto, number, boolean?, boolean?][],
    material?: MaterialDto
  ) {
    this.id = id;
    this.name = name;
    this.weight = weight;
    this.percentageOfRenewableMaterial = percentageOfRenewableMaterial;
    this.percentageOfRecycledMaterial = percentageOfRecycledMaterial;
    this.percentageOfRStrategies = percentageOfRStrategies;
    this.supplier = supplier;
    this.products = products;
    this.waste = waste;
    this.supplierName = supplierName;
    this.flags = flags;
    this.materials = materials;
    this.material = material;
  }
}
