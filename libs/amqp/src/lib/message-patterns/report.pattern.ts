/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ReportMessagePatterns {
  CREATE = '/reports/create',
  GET_ALL_REPORTS = '/reports/get-all',

  UPDATE = '/reports/update',
  UPDATE_STRATEGIES = '/reports/update/strategies',
  UPDATE_MEASURES = '/reports/update/measures',
  UPDATE_FINANCIAL_IMPACTS = '/reports/update/financial-impact',
  UPDATE_GOALS = '/reports/update/goals',

  DELETE = '/reports/delete',
  GET_REPORT_BY_ID = '/reports/get-by-id',
}
