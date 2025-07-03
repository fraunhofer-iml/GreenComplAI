/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PackagingCreateDto,
  ProductUpdateMapDto,
  WasteCreateDto,
} from '../../dtos';
import { PackagingUpdateDto } from '../../dtos/packaging/packaging-update.dto';

export type PackagingIdProps = {
  id: string;
};

export type CreatePackagingProps = {
  dto: PackagingCreateDto;
};

export type UpdatePackagingProps = {
  id: string;
  dto: PackagingUpdateDto;
};

export type UpdatePackagingWasteProps = {
  id: string;
  dto: WasteCreateDto;
};

export type UpdatePartPackagingProps = {
  id: string;
  dto: ProductUpdateMapDto;
};

export type FindAllPackagingProps = {
  filters?: string;
  sorting?: string;
  page?: number;
  size?: number;
};
