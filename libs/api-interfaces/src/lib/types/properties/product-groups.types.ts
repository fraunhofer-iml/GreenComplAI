/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductGroupCreateDto } from '../../dtos';

export type CreateProductGroupProps = {
  dto: ProductGroupCreateDto;
};
export type UpdateProductGroupProps = {
  dto: ProductGroupCreateDto;
  id: string;
};

export type FindAllProductGroupsProps = {
  filters?: string;
  sorting?: string;
  page: number;
  size: number;
};

export type FindProductGroupByIdProps = {
  id: string;
};
