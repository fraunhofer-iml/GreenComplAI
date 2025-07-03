/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeasureStatus } from '../../enums';
import { StrategyDto } from '../report/strategy.dto';

export class MeasureDto {
  id: string;
  // Mandatory
  title: string;
  status: MeasureStatus;
  expectedResult: string;
  contributionAchievingStrategy: string;
  plannedCompletion: Date;
  impactOnValueChainAndStakeholders: string;
  // Optional
  contributionIncreasedResourceEfficiency?: string;
  contributionHigherUtilizationRateOfSecondaryMaterials?: string;
  contributionCircularDesignToDurabilityAndRStrategies?: string;
  applicationOfCircularBusinessPractices?: string;
  measuresAndOptimizationInContextOfWaste?: string;
  progressQuantitative?: number;
  progressQualitative?: string;
  // Further parameters
  strategies: StrategyDto[];
  previousReport?: number;

  constructor(
    id: string,
    title: string,
    status: MeasureStatus,
    expectedResult: string,
    contributionAchievingStrategy: string,
    plannedCompletion: Date,
    impactOnValueChainAndStakeholders: string,
    contributionIncreasedResourceEfficiency: string,
    contributionHigherUtilizationRateOfSecondaryMaterials: string,
    contributionCircularDesignToDurabilityAndRStrategies: string,
    applicationOfCircularBusinessPractices: string,
    measuresAndOptimizationInContextOfWaste: string,
    progressQuantitative: number,
    progressQualitative: string,
    strategies: StrategyDto[],
    previousReport?: number
  ) {
    this.id = id;
    this.title = title;
    this.status = status;
    this.expectedResult = expectedResult;
    this.contributionAchievingStrategy = contributionAchievingStrategy;
    this.plannedCompletion = plannedCompletion;
    this.impactOnValueChainAndStakeholders = impactOnValueChainAndStakeholders;
    this.contributionIncreasedResourceEfficiency =
      contributionIncreasedResourceEfficiency;
    this.contributionHigherUtilizationRateOfSecondaryMaterials =
      contributionHigherUtilizationRateOfSecondaryMaterials;
    this.contributionCircularDesignToDurabilityAndRStrategies =
      contributionCircularDesignToDurabilityAndRStrategies;
    this.applicationOfCircularBusinessPractices =
      applicationOfCircularBusinessPractices;
    this.measuresAndOptimizationInContextOfWaste =
      measuresAndOptimizationInContextOfWaste;
    this.progressQuantitative = progressQuantitative;
    this.progressQualitative = progressQualitative;
    this.strategies = strategies;
    this.previousReport = previousReport;
  }
}
