/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ProductMessagePatterns {
  CREATE = '/products/create',
  READ_BY_ID = '/products/read-by-id',
  READ_ALL = '/products/read-all',
  UPDATE = '/products/update',
  UPDATE_BOM = '/products/update/bill-of-material',
  UPDATE_PACKAGING = '/products/update/packaging',
  UPDATE_WASTE = '/products/update/waste',
  UPDATE_HISTORY = '/products/update/history',
  DELETE = '/products/delete',
  SEARCH = '/products/search',
  PRELIMINARY = '/products/find-preliminary-products',
  PACKAGING = '/products/find-packaging',
  GET_ANALYSIS = '/products/get-analysis',
  GET_FOR_OUTLIER_DETECTION = '/products/get-for-outlier-detection',
  OUTLIERS = '/products/find-outliers',
  UPDATE_FLAGS = '/products/flags',
  OUTLIERS_VALIDATE = '/products/validate',
}
