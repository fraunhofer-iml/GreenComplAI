/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CriticalRawMaterials, RareEarths } from '../../types';
import { WasteCreateDto } from '../waste';

export class ProductCreateDto {
  name: string;
  id?: string;
  isSellable?: boolean;
  description?: string;
  productId?: string;
  category?: string;
  weight?: number;
  unit?: string;
  price?: number;
  dimensions?: string;
  percentageOfBiologicalMaterials?: number;

  durability?: number;
  durabilityDifference?: number;
  reparability?: number;

  billOfMaterial?: [ProductCreateDto, number][];
  billOfMaterialDescription?: string;

  waste?: Partial<WasteCreateDto>;

  packagings?: [string, number][];

  supplier?: string;
  manufacturer?: string;

  materials?: { material: string; percentage: number }[];

  productGroup?: string;
  variant?: string;
  warehouseLocation?: string;
  productionLocation?: string;

  wasteFlow?: string;

  rareEarths?: { material: RareEarths; percentage: number }[];
  criticalRawMaterials?: {
    material: CriticalRawMaterials;
    percentage: number;
  }[];

  waterUsed?: number;

  cascadePrinciple?: string;
  certification?: string;

  circularPrinciple?: boolean;
  productionHistory?: { amount: number; year: number }[];
  flags: string[];
  outliers?: string[];

  constructor(
    name: string,
    flags?: string[],
    isSellable?: boolean,
    description?: string,
    category?: string,
    weight?: number,
    unit?: string,
    price?: number,
    dimensions?: string,
    percentageOfBiologicalMaterials?: number,
    billOfMaterial?: [ProductCreateDto, number][],
    billOfMaterialDescription?: string,
    waste?: WasteCreateDto,
    supplier?: string,
    materials?: { material: string; percentage: number }[],
    durability?: number,
    durabilityDifference?: number,
    reparability?: number,
    rareEarths?: { material: RareEarths; percentage: number }[],
    criticalRawMaterials?: {
      material: CriticalRawMaterials;
      percentage: number;
    }[],
    producedItemsPerYear?: { amount: number; year: number }[],
    productGroup?: string,
    variant?: string,
    manufacturer?: string,
    productId?: string,
    packagings?: [string, number][],
    warehouseLocation?: string,
    productionLocation?: string,
    wasteFlow?: string,
    cascadePrincipal?: string,
    certification?: string,
    circularPrinciple?: boolean,
    outliers?: string[],
  ) {
    this.name = name;
    this.isSellable = isSellable;
    this.description = description;
    this.productId = productId;
    this.category = category;
    this.weight = weight;
    this.unit = unit;
    this.price = price;
    this.dimensions = dimensions;
    this.percentageOfBiologicalMaterials = percentageOfBiologicalMaterials;
    this.billOfMaterial = billOfMaterial;
    this.billOfMaterialDescription = billOfMaterialDescription;
    this.waste = waste;
    this.supplier = supplier;
    this.manufacturer = manufacturer;
    this.materials = materials;
    this.productGroup = productGroup;
    this.variant = variant;
    this.packagings = packagings;
    this.warehouseLocation = warehouseLocation;
    this.productionLocation = productionLocation;
    this.wasteFlow = wasteFlow;
    this.rareEarths = rareEarths;
    this.criticalRawMaterials = criticalRawMaterials;
    this.cascadePrinciple = cascadePrincipal;
    this.certification = certification;
    this.durability = durability;
    this.durabilityDifference = durabilityDifference;
    this.reparability = reparability;
    this.circularPrinciple = circularPrinciple;
    this.productionHistory = producedItemsPerYear;
    this.flags = flags ?? [];
    this.outliers = outliers ?? [];
  }
}
