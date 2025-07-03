/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyCreateDto } from '../../dtos';

export type CreateCompanyProps = {
  userId: string;
  dto: CompanyCreateDto;
};

export type FindAssociatedCompaniesProps = {
  userId: string;
  filters?: string;
  sorting?: string;
  page: number;
  size: number;
};

export type FindCompanyByIdProps = {
  id: string;
};

export type UpdateCompanyProps = {
  id: string;
  dto: CompanyCreateDto;
};

export type DeleteCompanyProps = {
  id: string;
};
