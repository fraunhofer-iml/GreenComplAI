/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class PackagingUpdateDto {
  id: string;
  name: string;
  weight: number;
  percentageOfRenewableMaterial: number;
  percentageOfRStrategies: number;
  percentageOfRecycledMaterial: number;
  supplierId: string;
  materialId: string;
  flags: string[];

  constructor(
    id: string,
    weight: number,
    name: string,
    percentageOfRenewableMaterial: number,
    percentageOfRStrategies: number,
    percentageOfRecycledMaterial: number,
    supplierId: string,
    materialId: string,
    flags: string[]
  ) {
    this.id = id;
    this.weight = weight;
    this.name = name;
    this.percentageOfRenewableMaterial = percentageOfRenewableMaterial;
    this.percentageOfRStrategies = percentageOfRStrategies;
    this.percentageOfRecycledMaterial = percentageOfRecycledMaterial;
    this.supplierId = supplierId;
    this.materialId = materialId;
    this.flags = flags;
  }
}
