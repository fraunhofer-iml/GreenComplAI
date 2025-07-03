/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class CreateReportDto {
  assetsBusinessActivitiesEvaluated: boolean;
  evaluationMethodsAssumptionsTools: string;
  consultationsConducted: boolean;
  consultationMethods: string;
  evaluationYear: number;
  isFinalReport: boolean;
  flags: string[];

  constructor(
    assetsBusinessActivitiesEvaluated: boolean,
    evaluationMethodsAssumptionsTools: string,
    consultationsConducted: boolean,
    consultationMethods: string,
    evaluationYear: number,
    isFinalReport: boolean,
    flags: string[]
  ) {
    this.assetsBusinessActivitiesEvaluated = assetsBusinessActivitiesEvaluated;
    this.evaluationMethodsAssumptionsTools = evaluationMethodsAssumptionsTools;
    this.consultationsConducted = consultationsConducted;
    this.consultationMethods = consultationMethods;
    this.evaluationYear = evaluationYear;
    this.isFinalReport = isFinalReport;
    this.flags = flags;
  }
}
