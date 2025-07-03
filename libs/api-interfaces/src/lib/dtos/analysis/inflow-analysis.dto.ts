/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { aggregateItemsWithAmount } from '@ap2/util';

export class InFlowAnalysisDto {
  amount: number;
  materials: [string, number][];
  packagings: [string, number][];
  criticalMaterials: [string, number][];
  rareEarths: [string, number][];
  water: number;
  analysis: GenericInFlowAnalysisDto[];

  constructor(analysis: GenericInFlowAnalysisDto[]) {
    this.amount = analysis.reduce((acc, curr) => acc + curr.amount, 0);
    this.materials = aggregateItemsWithAmount(
      analysis.flatMap((a) => a.materials)
    );
    this.criticalMaterials = aggregateItemsWithAmount(
      analysis.flatMap((m) => m.criticalMaterials)
    );
    this.rareEarths = aggregateItemsWithAmount(
      analysis.flatMap((m) => m.rareEarths)
    );
    this.water = analysis.reduce((acc, curr) => {
      return acc + curr.water;
    }, 0);

    this.analysis = analysis;
    this.packagings = aggregateItemsWithAmount(
      analysis.flatMap((a) => a.packagings)
    );
  }
}

export class GenericInFlowAnalysisDto {
  id: string;
  name: string;
  amount: number;
  materials: [string, number][];
  packagings: [string, number][];
  criticalMaterials: [string, number][];
  rareEarths: [string, number][];
  water: number;

  constructor(
    id: string,
    name: string,
    boughtProdcts: number,
    materials: [string, number][],
    packagings: [string, number][],
    criticalMaterials: [string, number][],
    rareEarths: [string, number][],
    water: number
  ) {
    this.id = id;
    this.name = name;
    this.amount = boughtProdcts;
    this.materials = materials;
    this.packagings = packagings;
    this.criticalMaterials = criticalMaterials;
    this.rareEarths = rareEarths;
    this.water = water;
  }
}
