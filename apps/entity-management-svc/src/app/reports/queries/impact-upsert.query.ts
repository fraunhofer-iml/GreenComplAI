/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FinancialImpactCreateDto } from '@ap2/api-interfaces';
import { Prisma } from '@prisma/client';

export const upsertFinancialImpact = (
  impact: FinancialImpactCreateDto,
  reportId: string
) =>
  ({
    where: { id: impact.id ?? '' },
    create: {
      title: impact.title,
      type: impact.type,
      description: impact.description,
      descriptionFinancialEffects: impact.descriptionFinancialEffects,
      financialImpactMax: impact.financialImpactMax,
      financialImpactMin: impact.financialImpactMin,
      reportId: reportId,
      criticalAssumptions: {
        create: impact.criticalAssumptions.map((assumption) => ({
          degreeOfUncertainty: assumption.degreeOfUncertainty,
          sourceInformation: assumption.sourceInformation,
          title: assumption.title,
        })),
      },
    },
    update: {
      title: impact.title,
      type: impact.type,
      description: impact.description,
      descriptionFinancialEffects: impact.descriptionFinancialEffects,
      financialImpactMax: impact.financialImpactMax,
      financialImpactMin: impact.financialImpactMin,
      reportId: reportId,
      criticalAssumptions: {
        upsert: impact.criticalAssumptions.map((assumption) => ({
          where: { id: assumption.id ?? '' },
          update: {
            degreeOfUncertainty: assumption.degreeOfUncertainty,
            sourceInformation: assumption.sourceInformation,
            title: assumption.title,
          },
          create: {
            degreeOfUncertainty: assumption.degreeOfUncertainty,
            sourceInformation: assumption.sourceInformation,
            title: assumption.title,
          },
        })),
      },
    },
  }) satisfies Prisma.FinancialImpactUpsertArgs;
