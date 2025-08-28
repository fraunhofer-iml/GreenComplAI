/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class OutlierDetectionAnalysisDto {
  totalNumberOfProducts: number;
  totalNumberOfOutliers: number;
  outliesByItem: OutliersByItem[];

  constructor(
    totalNumberOfProducts: number,
    totalNumberOfOutliers: number,
    outliesByItem: OutliersByItem[]
  ) {
    this.totalNumberOfProducts = totalNumberOfProducts;
    this.totalNumberOfOutliers = totalNumberOfOutliers;
    this.outliesByItem = outliesByItem;
  }
}

export class OutliersByItem {
  id: string;
  numberOfOutliers: number;
  numberOfProducts: number;
  name?: string;

  constructor(
    id: string,
    numberOfProducts: number,
    numberOfOutliers: number,
    name?: string
  ) {
    this.id = id;
    this.numberOfOutliers = numberOfOutliers;
    this.numberOfProducts = numberOfProducts;
    this.name = name;
  }
}
