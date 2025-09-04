/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteCreateDto } from '../waste';

export class PackagingCreateDto {
  weight: number;
  name: string;
  percentageOfRenewableMaterial: number;
  percentageOfRecycledMaterial: number;
  percentageOfRStrategies: number;
  supplierId: string;
  materialId: string;
  partPackagings: [string, number][];
  materials?: {
    material: string;
    percentage: number;
    renewable?: boolean;
    primary?: boolean;
  }[];
  flags: string[];
  waste?: WasteCreateDto;

  constructor(
    weight: number,
    name: string,
    percentageOfRenewableMaterial: number,
    percentageOfRecycledMaterial: number,
    percentageOfRStrategies: number,
    supplierId: string,
    materialId: string,
    partPackagings: [string, number][],
    flags: string[],
    waste?: WasteCreateDto,
    materials?: {
      material: string;
      percentage: number;
      renewable?: boolean;
      primary?: boolean;
    }[]
  ) {
    this.weight = weight;
    this.name = name;
    this.percentageOfRenewableMaterial = percentageOfRenewableMaterial;
    this.percentageOfRecycledMaterial = percentageOfRecycledMaterial;
    this.percentageOfRStrategies = percentageOfRStrategies;
    this.supplierId = supplierId;
    this.materialId = materialId;
    this.partPackagings = partPackagings;
    this.waste = waste;
    this.flags = flags;
    this.materials = materials;
  }
}
