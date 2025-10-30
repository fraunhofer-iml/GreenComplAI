/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CriticalAssumptionDto,
  FinancialImpactDto,
  GoalDto,
  GoalPlanningDto,
  ImpactType,
  MeasureDto,
  MeasureStatus,
  ReportDto,
  ReportEntity,
  ReportEntityOverview,
  ReportOverviewDto,
  StrategyDto,
} from '@ap2/api-interfaces';

export function toReportDto(entity: ReportEntity | null): ReportDto | null {
  if (!entity) {
    return null;
  }

  return new ReportDto(
    entity.id,
    entity.assetsBusinessActivitiesEvaluated,
    entity.evaluationMethodsAssumptionsTools,
    entity.consultationsConducted,
    entity.consultationMethods,
    entity.evaluationYear,
    entity.isFinalReport,
    entity.strategies.map(
      (s) =>
        new StrategyDto(
          s.id,
          s.name,
          s.conceptInformationResources,
          s.resourceImpactAndRecycling,
          s.sustainableProcurementImpact
        )
    ),
    entity.measures.map((m) => ({
      id: m.id,
      title: m.title,
      status:
        m.status === MeasureStatus.IN_PROGRESS
          ? MeasureStatus.IN_PROGRESS
          : MeasureStatus.PLANNED,
      expectedResult: m.expectedResult,
      contributionAchievingStrategy: m.contributionAchievingStrategy,
      plannedCompletion: m.plannedCompletion,
      impactOnValueChainAndStakeholders: m.impactOnValueChainAndStakeholders,
      contributionIncreasedResourceEfficiency:
        m.contributionIncreasedResourceEfficiency,
      contributionHigherUtilizationRateOfSecondaryMaterials:
        m.contributionHigherUtilizationRateOfSecondaryMaterials,
      contributionCircularDesignToDurabilityAndRStrategies:
        m.contributionCircularDesignToDurabilityAndRStrategies,
      applicationOfCircularBusinessPractices:
        m.applicationOfCircularBusinessPractices,
      measuresAndOptimizationInContextOfWaste:
        m.measuresAndOptimizationInContextOfWaste,
      progressQuantitative: m.progressQuantitative,
      progressQualitative: m.progressQualitative,
      strategies: m.strategies
        .map((s) => s.strategy)
        .map(
          (s) =>
            new StrategyDto(
              s.id,
              s.name,
              s.conceptInformationResources,
              s.resourceImpactAndRecycling,
              s.sustainableProcurementImpact
            )
        ),
      previousReport: m.previousReport?.evaluationYear,
    })) as MeasureDto[],
    entity.financialImpacts.map((f) => ({
      id: f.id,
      type: f.type === ImpactType.CHANCE ? ImpactType.CHANCE : ImpactType.RISK,
      title: f.title,
      description: f.description,
      financialImpactMin: f.financialImpactMin,
      financialImpactMax: f.financialImpactMax,
      descriptionFinancialEffects: f.descriptionFinancialEffects,
      criticalAssumptions: f.criticalAssumptions.map(
        (ca) =>
          new CriticalAssumptionDto(
            ca.id,
            ca.title,
            ca.sourceInformation,
            ca.degreeOfUncertainty
          )
      ),
    })) as FinancialImpactDto[],
    entity.goalPlanning
      ? (() => {
          const goalPlanning = new GoalPlanningDto();
          goalPlanning.id = entity.goalPlanning.id;
          goalPlanning.hasPlannedGoals = entity.goalPlanning.hasPlannedGoals;
          goalPlanning.goalsTracked = entity.goalPlanning.goalsTracked;
          goalPlanning.noGoalsExplanation =
            entity.goalPlanning.noGoalsExplanation;
          goalPlanning.followUpProcedure =
            entity.goalPlanning.followUpProcedure;
          goalPlanning.targets = entity.goalPlanning.targets;
          goalPlanning.progressEvaluation =
            entity.goalPlanning.progressEvaluation;
          goalPlanning.referencePeriodForProgressStart =
            entity.goalPlanning.referencePeriodForProgressStart;
          goalPlanning.referencePeriodForProgressEnd =
            entity.goalPlanning.referencePeriodForProgressEnd;
          goalPlanning.deadlineStart = entity.goalPlanning.deadlineStart;
          goalPlanning.deadlineEnd = entity.goalPlanning.deadlineEnd;
          return goalPlanning;
        })()
      : undefined,
    entity.goals.map((g) => ({
      id: g.id,
      title: g.title,
      obligation: g.obligation,
      target: g.target,
      isRelative: g.isRelative,
      scope: g.scope,
      action: g.action,
      unit: g.unit,
      geographicScope: g.geographicScope,
      methodsAndAssumptions: g.methodsAndAssumptions,
      referenceValue: g.referenceValue,
      referenceYear: g.referenceYear,
      isScientificReferenced: g.isScientificReferenced,
      stakeholderInclusion: g.stakeholderInclusion,
      changeOfGoalsOrMethods: g.changeOfGoalsOrMethods,
      effortsAndMonitoring: g.effortsAndMonitoring,
      impactOnExtensionOfCircularityProductDesign:
        g.impactOnExtensionOfCircularityProductDesign,
      impactOnCircularityMaterialRate: g.impactOnCircularityMaterialRate,
      impactOnMinimizingOfPrimaryMaterialUse:
        g.impactOnMinimizingOfPrimaryMaterialUse,
      impactOnSustainableSourcing: g.impactOnSustainableSourcing,
      impactOnWasteManagement: g.impactOnWasteManagement,
      impactOnMiscellaneous: g.impactOnMiscellaneous,
      wasteHLevel: g.wasteHLevel,
      stakeholderInclusionComment: g.stakeholderInclusionComment,
      hasEcologicalImpact: g.hasEcologicalImpact,
      ecologicalThresholdDescription: g.ecologicalThresholdDescription,
      ecologicalThresholdDetermination: g.ecologicalThresholdDetermination,
      ecologicalThresholdResponsibilities:
        g.ecologicalThresholdResponsibilities,
      validityPeriodStart: g.validityPeriodStart,
      validityPeriodEnd: g.validityPeriodEnd,
      strategies: g.strategies.map((gs) => ({
        id: gs.strategy.id,
        connection: gs.connection,
      })),
    })) as GoalDto[],
    entity.flags ?? []
  );
}

export function toReportOverviewDto(
  entity: ReportEntityOverview
): ReportOverviewDto {
  return {
    id: entity.id,
    evaluationYear: entity.evaluationYear,
    consultationsConducted: entity.consultationsConducted,
    assetsBusinessActivitiesEvaluated: entity.assetsBusinessActivitiesEvaluated,
    isFinalReport: entity.isFinalReport,
    numberOfGoals: entity._count.goals,
    numberOfMeasures: entity._count.measures,
    numberOfStrategies: entity._count.strategies,
  };
}
