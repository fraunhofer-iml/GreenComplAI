/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class AnalysisDto {
  totalWeightOfProduct: number;
  totalWeightOfMaterial: number;
  percentageOfBiologicalMaterialsOfProduct: number;
  amountOfRenewableMaterialOfProduct: number;
  percentageOfRenewableMaterialOfPackaging: number;
  amountOfRenewableMaterialOfPackaging: number;
  amountOfRecycledPreProductOfProduct: number;
  amountOfRecycledMaterialOfPackaging: number;
  amountOfDangerousWaste: number;
  amountOfRadioactiveWaste: number;
  upstreamWaterConsumption: number;
  productionWaterConsumption: number;

  constructor(
    totalWeightOfProduct: number,
    totalWeightOfMaterial: number,
    percentageOfBiologicalMaterialsOfProduct: number,
    amountOfRenewableMaterialOfProduct: number,
    percentageOfRenewableMaterialOfPackaging: number,
    amountOfRenewableMaterialOfPackaging: number,
    amountOfRecycledPreProductOfProduct: number,
    amountOfRecycledMaterialOfPackaging: number,
    amountOfDangerousGoods: number,
    amountOfRadioactiveWaste: number,
    upstreamWaterConsumption: number,
    productionWaterConsumption: number
  ) {
    this.totalWeightOfProduct = totalWeightOfProduct;
    this.totalWeightOfMaterial = totalWeightOfMaterial;
    this.percentageOfBiologicalMaterialsOfProduct =
      percentageOfBiologicalMaterialsOfProduct;
    this.amountOfRenewableMaterialOfProduct =
      amountOfRenewableMaterialOfProduct;
    this.percentageOfRenewableMaterialOfPackaging =
      percentageOfRenewableMaterialOfPackaging;
    this.amountOfRenewableMaterialOfPackaging =
      amountOfRenewableMaterialOfPackaging;
    this.amountOfRecycledPreProductOfProduct =
      amountOfRecycledPreProductOfProduct;
    this.amountOfRecycledMaterialOfPackaging =
      amountOfRecycledMaterialOfPackaging;
    this.amountOfDangerousWaste = amountOfDangerousGoods;
    this.amountOfRadioactiveWaste = amountOfRadioactiveWaste;
    this.upstreamWaterConsumption = upstreamWaterConsumption;
    this.productionWaterConsumption = productionWaterConsumption;
  }
}
