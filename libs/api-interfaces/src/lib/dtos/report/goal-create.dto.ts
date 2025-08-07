/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class GoalCreateDto {
  id?: string;
  title: string;
  obligation: string;
  target: string;
  isRelative: boolean;
  scope: string;
  action: string;
  unit: string;
  geographicScope: string;
  methodsAndAssumptions: string;
  referenceValue: string;
  referenceYear: number;
  isScientificReferenced: boolean;
  stakeholderInclusion: boolean;
  changeOfGoalsOrMethods: string;
  effortsAndMonitoring: string;
  impactOnExtensionOfCircularityProductDesign: string;
  impactOnCircularityMaterialRate: string;
  impactOnMinimizingOfPrimaryMaterialUse: string;
  impactOnSustainableSourcing: string;
  impactOnWasteManagement: string;
  impactOnMiscellaneous: string;
  wasteHLevel: string;
  stakeholderInclusionComment: string;
  hasEcologicalImpact: boolean;
  ecologicalThresholdDescription: string;
  ecologicalThresholdDetermination: string;
  ecologicalThresholdResponsibilities: string;
  validityPeriodStart: Date;
  validityPeriodEnd: Date;
  strategies: { id: string; connection: string }[];

  constructor(
    id: string | undefined,
    title: string,
    obligation: string,
    target: string,
    isRelative: boolean,
    scope: string,
    action: string,
    unit: string,
    geographicScope: string,
    methodsAndAssumptions: string,
    referenceValue: string,
    referenceYear: number,
    isScientificReferenced: boolean,
    stakeholderInclusion: boolean,
    changeOfGoalsOrMethods: string,
    effortsAndMonitoring: string,
    impactOnExtensionOfCircularityProductDesign: string,
    impactOnCircularityMaterialRate: string,
    impactOnMinimizingOfPrimaryMaterialUse: string,
    impactOnSustainableSourcing: string,
    impactOnWasteManagement: string,
    impactOnMiscellaneous: string,
    wasteHLevel: string,
    stakeholderInclusionComment: string,
    hasEcologicalImpact: boolean,
    ecologicalThresholdDescription: string,
    ecologicalThresholdDetermination: string,
    ecologicalThresholdResponsibilities: string,
    validityPeriodStart: Date,
    validityPeriodEnd: Date
  ) {
    this.id = id;
    this.title = title;
    this.obligation = obligation;
    this.target = target;
    this.isRelative = isRelative;
    this.scope = scope;
    this.action = action;
    this.unit = unit;
    this.geographicScope = geographicScope;
    this.methodsAndAssumptions = methodsAndAssumptions;
    this.referenceValue = referenceValue;
    this.referenceYear = referenceYear;
    this.isScientificReferenced = isScientificReferenced;
    this.stakeholderInclusion = stakeholderInclusion;
    this.changeOfGoalsOrMethods = changeOfGoalsOrMethods;
    this.effortsAndMonitoring = effortsAndMonitoring;
    this.impactOnExtensionOfCircularityProductDesign =
      impactOnExtensionOfCircularityProductDesign;
    this.impactOnCircularityMaterialRate = impactOnCircularityMaterialRate;
    this.impactOnMinimizingOfPrimaryMaterialUse =
      impactOnMinimizingOfPrimaryMaterialUse;
    this.impactOnSustainableSourcing = impactOnSustainableSourcing;
    this.impactOnWasteManagement = impactOnWasteManagement;
    this.impactOnMiscellaneous = impactOnMiscellaneous;
    this.wasteHLevel = wasteHLevel;
    this.stakeholderInclusionComment = stakeholderInclusionComment;
    this.hasEcologicalImpact = hasEcologicalImpact;
    this.ecologicalThresholdDescription = ecologicalThresholdDescription;
    this.ecologicalThresholdDetermination = ecologicalThresholdDetermination;
    this.ecologicalThresholdResponsibilities =
      ecologicalThresholdResponsibilities;
    this.validityPeriodStart = validityPeriodStart;
    this.validityPeriodEnd = validityPeriodEnd;
    this.strategies = [];
  }
}
