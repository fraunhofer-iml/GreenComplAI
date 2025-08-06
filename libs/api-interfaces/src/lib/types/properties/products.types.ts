/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductCreateDto,
  ProductUpdateDto,
  ProductUpdateFlagsDto,
  ProductUpdateHistoryDto,
  ProductUpdateMapDto,
  WasteCreateDto,
} from '../../dtos';

export type CreateProductProps = {
  dto: ProductCreateDto;
  outlierDetectionResult: string[];
};

export type FindAllProductsProps = {
  filters?: string;
  sorting?: string;
  page: number;
  size: number;
  isSellable?: boolean;
  supplierCompanyId?: string;
};

export type FindProductByIdProps = {
  id: string;
};

export type UpdateProductProps = {
  id: string;
  dto: ProductUpdateDto;
};

export type UpdateFlagProductProps = {
  id: string;
  dto: ProductUpdateFlagsDto;
};

export type DeleteProductProps = {
  id: string;
};

export type SearchProductsProps = {
  value: string;
};

export type UpdateProductDependenciesProps = {
  id: string;
  dto: ProductUpdateMapDto;
};

export type UpdateProductWasteProps = {
  id: string;
  dto: WasteCreateDto;
};

export type UpdateProductionHistoryProps = {
  id: string;
  dto: ProductUpdateHistoryDto;
};
