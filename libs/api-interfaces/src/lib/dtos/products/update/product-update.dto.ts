/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CriticalRawMaterials, RareEarths } from '../../../types';
import { ProductMasterDataDto } from '../product-master-data.dto';

export class ProductUpdateDto {
  masterData: ProductMasterDataDto;
  materials: { material: string; percentage: number }[];
  rareEarths: { material: RareEarths; percentage: number }[];
  criticalRawMaterials: {
    material: CriticalRawMaterials;
    percentage: number;
  }[];

  constructor(
    masterData: ProductMasterDataDto,
    materials: { material: string; percentage: number }[],
    rareEarths: { material: RareEarths; percentage: number }[],
    criticalRawMaterials: {
      material: CriticalRawMaterials;
      percentage: number;
    }[]
  ) {
    this.masterData = masterData;
    this.materials = materials;
    this.rareEarths = rareEarths;
    this.criticalRawMaterials = criticalRawMaterials;
  }
}
