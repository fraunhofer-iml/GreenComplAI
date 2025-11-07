/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CriticalRawMaterials } from '../../types/custom-types';
import { CompanyCreateDto } from '../companies';

export class ImportDppDto {
  id?: string;
  aasIdentifier: string;
  productId?: string;
  name?: string;
  gtin?: string;
  taricCode?: string;
  supplier?: CompanyCreateDto;
  importerName?: string;
  importerPhone?: string;
  importerAddress?: string;
  importerEmail?: string;
  waterUsed?: number;
  productCarbonFootprint?: number;
  reparability?: number;

  materials?: {
    material: string;
    percentage: number;
    renewable?: boolean;
    primary?: boolean;
  }[];
  criticalRawMaterials?: {
    material: CriticalRawMaterials;
    percentage: number;
  }[];

  constructor(
    materials: {
      material: string;
      percentage: number;
      renewable?: boolean;
      primary?: boolean;
    }[],
    criticalRawMaterials: {
      material: CriticalRawMaterials;
      percentage: number;
    }[],

    aasIdentifier: string,
    productId: string,
    name: string,
    gtin: string,
    taricCode: string,
    supplier: CompanyCreateDto,
    importerName: string,
    importerPhone: string,
    importerAddress: string,
    importerEmail: string,
    waterUsed: number,
    productCarbonFootprint: number,
    reparability: number,
    id?: string
  ) {
    this.materials = materials;
    this.criticalRawMaterials = criticalRawMaterials;

    this.id = id;
    this.aasIdentifier = aasIdentifier;
    this.productId = productId;
    this.name = name;
    this.gtin = gtin;
    this.taricCode = taricCode;
    this.supplier = supplier;
    this.importerName = importerName;
    this.importerAddress = importerAddress;
    this.importerEmail = importerEmail;
    this.importerPhone = importerPhone;
    this.waterUsed = waterUsed;
    this.productCarbonFootprint = productCarbonFootprint;
    this.reparability = reparability;
  }
}
