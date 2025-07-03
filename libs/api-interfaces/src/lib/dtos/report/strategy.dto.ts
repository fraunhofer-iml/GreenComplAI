/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class StrategyDto {
  id: string;
  name: string;
  conceptInformationResources: string;
  resourceImpactAndRecycling: string;
  sustainableProcurementImpact: string;

  constructor(
    id: string,
    name: string,
    conceptInformationResources: string,
    resourceImpactAndRecycling: string,
    sustainableProcurementImpact: string
  ) {
    this.id = id;
    this.name = name;
    this.conceptInformationResources = conceptInformationResources;
    this.resourceImpactAndRecycling = resourceImpactAndRecycling;
    this.sustainableProcurementImpact = sustainableProcurementImpact;
  }
}
