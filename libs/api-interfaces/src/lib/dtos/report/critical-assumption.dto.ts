/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class CriticalAssumptionDto {
  id?: string;
  title: string;
  sourceInformation: string;
  degreeOfUncertainty: string;

  constructor(
    id: string,
    title: string,
    sourceInformation: string,
    degreeOfUncertainty: string
  ) {
    this.id = id;
    this.sourceInformation = sourceInformation;
    this.title = title;
    this.degreeOfUncertainty = degreeOfUncertainty;
  }
}
