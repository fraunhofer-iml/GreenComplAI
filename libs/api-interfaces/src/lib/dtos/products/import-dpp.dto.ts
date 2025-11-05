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
  materials: {
    material: string;
    percentage: number;
    renewable?: boolean;
    primary?: boolean;
  }[];
  criticalRawMaterials: {
    material: CriticalRawMaterials;
    percentage: number;
  }[];

  productId: string;
  name: string;
  gtin: string;
  taricCode: string;
  supplier: CompanyCreateDto;
  importerName: string;
  importerPhone: string;
  importerAddress: string;
  importerEmail: string;

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

    productId: string,
    name: string,
    gtin: string,
    taricCode: string,
    supplier: CompanyCreateDto,
    importerName: string,
    importerPhone: string,
    importerAddress: string,
    importerEmail: string
  ) {
    this.materials = materials;
    this.criticalRawMaterials = criticalRawMaterials;

    this.productId = productId;
    this.name = name;
    this.gtin = gtin;
    this.taricCode = taricCode;
    this.supplier = supplier;
    this.importerName = importerName;
    this.importerAddress = importerAddress;
    this.importerEmail = importerEmail;
    this.importerPhone = importerPhone;
  }
}
