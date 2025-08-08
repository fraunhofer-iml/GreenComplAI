/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class ReportOverviewDto {
  id: string;
  evaluationYear: number;
  isFinalReport: boolean;
  consultationsConducted: boolean;
  assetsBusinessActivitiesEvaluated: boolean;
  numberOfMeasures: number;
  numberOfStrategies: number;
  numberOfGoals: number;

  constructor(
    id: string,
    evaluationYear: number,
    isFinalReport: boolean,
    consultationsConducted: boolean,
    assetsBusinessActivitiesEvaluated: boolean,
    numberOfMeasures: number,
    numberOfStrategies: number,
    numberOfGoals: number
  ) {
    this.id = id;
    this.evaluationYear = evaluationYear;
    this.isFinalReport = isFinalReport;
    this.consultationsConducted = consultationsConducted;
    this.assetsBusinessActivitiesEvaluated = assetsBusinessActivitiesEvaluated;
    this.numberOfGoals = numberOfGoals;
    this.numberOfMeasures = numberOfMeasures;
    this.numberOfStrategies = numberOfStrategies;
  }
}
