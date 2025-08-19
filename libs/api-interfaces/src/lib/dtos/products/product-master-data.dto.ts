/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class ProductMasterDataDto {
  name: string;
  isSellable?: boolean;
  description: string;
  productId?: string;
  category: string;
  weight: number;
  unit: string;
  price: number;
  dimensions: string;
  percentageOfBiologicalMaterials: number;

  durability: number;
  durabilityDifference: number;
  reparability: number;

  supplier: string;
  manufacturer?: string;

  productGroup?: string;
  variant?: string;
  warehouseLocation?: string;
  productionLocation?: string;

  wasteFlow?: string;

  waterUsed?: number;

  cascadePrinciple?: string;
  certification?: string;
  digitalProductPassportUrl?: string;

  circularPrinciple?: boolean;

  flags: string[];

  constructor(
    name: string,
    isSellable: boolean,
    description: string,
    category: string,
    weight: number,
    unit: string,
    price: number,
    dimensions: string,
    percentageOfBiologicalMaterials: number,
    supplier: string,
    durability: number,
    durabilityDifference: number,
    reparability: number,
    flags: string[],

    productGroup?: string,
    variant?: string,
    manufacturer?: string,
    productId?: string,
    warehouseLocation?: string,
    productionLocation?: string,
    wasteFlow?: string,
    cascadePrincipal?: string,
    certification?: string,
    circularPrinciple?: boolean,
    digitalProductPassportUrl?: string
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

    this.supplier = supplier;
    this.manufacturer = manufacturer;
    this.productGroup = productGroup;
    this.variant = variant;
    this.warehouseLocation = warehouseLocation;
    this.productionLocation = productionLocation;
    this.wasteFlow = wasteFlow;
    this.cascadePrinciple = cascadePrincipal;
    this.certification = certification;
    this.durability = durability;
    this.durabilityDifference = durabilityDifference;
    this.reparability = reparability;
    this.circularPrinciple = circularPrinciple;
    this.flags = flags;
    this.digitalProductPassportUrl = digitalProductPassportUrl;
  }
}
