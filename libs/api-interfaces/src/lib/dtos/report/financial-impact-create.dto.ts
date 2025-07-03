/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpactType } from '../../enums';
import { CriticalAssumptionDto } from './critical-assumption.dto';

export class FinancialImpactCreateDto {
  id?: string;
  title: string;
  type: ImpactType;
  description: string;
  financialImpactMin: number;
  financialImpactMax: number;
  descriptionFinancialEffects: string;

  criticalAssumptions: CriticalAssumptionDto[];

  constructor(
    id: string,
    title: string,
    description: string,
    type: ImpactType,
    financialImpactMin: number,
    financialImpactMax: number,
    descriptionFinancialEffects: string,
    criticalAssumptions: CriticalAssumptionDto[]
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.type = type;
    this.financialImpactMin = financialImpactMin;
    this.financialImpactMax = financialImpactMax;
    this.descriptionFinancialEffects = descriptionFinancialEffects;
    this.criticalAssumptions = criticalAssumptions;
  }
}
