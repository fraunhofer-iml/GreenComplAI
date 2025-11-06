/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto, CompanyDto, CompanyEntity } from '@ap2/api-interfaces';

export function toCompanyDto(entity: CompanyEntity | null): CompanyDto | null {
  if (!entity) {
    return null;
  }

  return new CompanyDto(
    entity.id,
    entity.name,
    entity.email ?? '',
    entity.phone ?? '',
    (entity.addresses ?? []).map(
      (addr) =>
        new AddressDto(
          addr.street ?? '',
          addr.city ?? '',
          addr.postalCode ?? '',
          addr.country ?? '',
          addr.id
        )
    ),
    entity.flags ?? []
  );
}
