/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Uris {
  companies = '/companies',
  createCompany = '/companies/create',
  products = '/products',
  packaging = '/packaging',
  analysis = '/analysis',
}

export enum ApiUris {
  products = '/products',
  supplierProducts = '/suppliers/products',
  searchProducts = '/products/search',
  companies = '/companies',
  associateCompanies = '/companies/associate',
  packaging = '/packaging',
  wasteFlow = '/analysis/out',
  groups = '/product-groups',
  inFlow = '/analysis/in',
  reports = '/reports',
  mapping = '/mappings',
  outlierAnalysis = '/analysis/outlier-detection',
  dpp = '/dpp',
}
