/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export type WasteFlowAnalysisDto = {
  totalWeight: number;
  totalProducedItems: number;
  normalNonUtilizableWasteWeight: number;
  hazardousNonUtilizableWasteWeight: number;
  normalUtilizableWasteWeight: number;
  hazardousUtilizableWasteWeight: number;
  totalWasteWeightNotRecyclable: number;
  totalWasteWeightNotRecyclablePercentage: number;
  analysis: GenericWasteFlowAnalysisDto[];
};

export type GenericWasteFlowAnalysisDto = {
  id: string;
  name: string;
  wasteWeight: number;
  producedItems: number;
  normalWaste: {
    nonUtilizableWaste: NonUtilizableWasteAnalysisDto;
    utilizableWaste: UtilizableWasteAnalysisDto;
  };
  hazardousWaste: {
    nonUtilizableWaste: NonUtilizableWasteAnalysisDto;
    utilizableWaste: UtilizableWasteAnalysisDto;
  };
  wasteWeightNotRecyclable: number;
  wasteWeightNotRecyclablePercentage: number;
};

type NonUtilizableWasteAnalysisDto = {
  landfillWeight: number;
  combustionWeight: number;
  miscellaneousWeight: number;
};

type UtilizableWasteAnalysisDto = {
  preparationForRecyclingWeight: number;
  miscellaneousWeight: number;
  recyclingWeight: number;
};
