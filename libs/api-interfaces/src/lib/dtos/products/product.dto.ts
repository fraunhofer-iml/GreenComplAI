/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto } from '../address';
import { CompanyDto } from '../companies';
import { MaterialDto } from '../material';
import { PackagingDto } from '../packaging';
import { WasteDto } from '../waste';
import { ProductGroupDto } from './product-group.dto';

export class ProductDto {
  id: string;
  name: string;
  productId?: string;
  description: string;
  category: string;
  weight: number;
  unit: string;
  price: number;
  dimensions: string;
  percentageOfBiologicalMaterials: number;
  billOfMaterialDescription: string;

  durability: number;
  durabilityDifference: number;
  reparability: number;
  supplier?: CompanyDto;
  importerName?: string;
  importerEmail?: string;
  importerPhone?: string;
  importerAddress?: string;
  manufacturer?: CompanyDto;
  waste?: Partial<WasteDto>;
  materials?: [MaterialDto, number, boolean?, boolean?][];
  productGroup?: ProductGroupDto;
  packagings?: [PackagingDto, number][];
  warehouseLocation?: AddressDto;
  productionLocation?: AddressDto;
  wasteFlow?: string;
  variant?: string;
  rareEarths?: [MaterialDto, number][];
  criticalRawMaterials?: [MaterialDto, number][];
  waterUsed?: number;
  productCarbonFootprint?: number;
  isSellable?: boolean;
  cascadePrinciple?: string;
  certificationSystem?: string;
  digitalProductPassportUrl?: string;
  taricCode?: string;
  gtin?: string;

  circularPrinciple?: boolean;
  circularPrincipleJustification?: string;
  circularPrincipleMeasureable?: boolean;
  circularPrincipleAssumption?: string;

  productionHistory?: { amount: number; year: number }[];
  flags: string[];
  outlier?: string[];

  // Generate constructor
  constructor(
    id: string,
    name: string,
    description: string,
    category: string,
    weight: number,
    unit: string,
    price: number,
    dimensions: string,
    percentageOfBiologicalMaterials: number,
    durability: number,
    durabilityDifference: number,
    reparability: number,
    rareEarths: [MaterialDto, number][],
    criticalRawMaterials: [MaterialDto, number][],
    billOfMaterialDescription: string,
    flags: string[],
    outlier?: string[],
    supplier?: CompanyDto,
    importerName?: string,
    importerEmail?: string,
    importerPhone?: string,
    importerAddress?: string,
    manufacturer?: CompanyDto,
    waste?: WasteDto,
    materials?: [MaterialDto, number, boolean?, boolean?][],
    productId?: string,
    productGroup?: ProductGroupDto,
    packagings?: [PackagingDto, number][],
    warehouseLocation?: AddressDto,
    productionLocation?: AddressDto,
    wasteFlow?: string,
    variant?: string,
    waterUsed?: number,
    productCarbonFootprint?: number,
    isSellable?: boolean,
    cascadePrinciple?: string,
    certificationSystem?: string,
    circularPrinciple?: boolean,
    productionHistory?: { amount: number; year: number }[],
    digitalProductPassportUrl?: string,
    taricCode?: string,
    gtin?: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.weight = weight;
    this.unit = unit;
    this.price = price;
    this.dimensions = dimensions;
    this.percentageOfBiologicalMaterials = percentageOfBiologicalMaterials;
    this.supplier = supplier;
    this.importerName = importerName;
    this.importerEmail = importerEmail;
    this.importerPhone = importerPhone;
    this.importerAddress = importerAddress;
    this.manufacturer = manufacturer;
    this.waste = waste;
    this.materials = materials;
    this.productId = productId;
    this.productGroup = productGroup;
    this.packagings = packagings;
    this.warehouseLocation = warehouseLocation;
    this.productionLocation = productionLocation;
    this.wasteFlow = wasteFlow;
    this.variant = variant;
    this.rareEarths = rareEarths;
    this.criticalRawMaterials = criticalRawMaterials;
    this.waterUsed = waterUsed;
    this.productCarbonFootprint = productCarbonFootprint;
    this.isSellable = isSellable;
    this.cascadePrinciple = cascadePrinciple;
    this.certificationSystem = certificationSystem;
    this.durability = durability;
    this.durabilityDifference = durabilityDifference;
    this.reparability = reparability;
    this.circularPrinciple = circularPrinciple;
    this.productionHistory = productionHistory;
    this.billOfMaterialDescription = billOfMaterialDescription;
    this.flags = flags;
    this.outlier = outlier;
    this.digitalProductPassportUrl = digitalProductPassportUrl;
    this.taricCode = taricCode;
    this.gtin = gtin;
  }
}
