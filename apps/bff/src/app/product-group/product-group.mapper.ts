/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductGroupDto,
  ProductGroupEntity,
  ProductGroupEntityList,
  VariantDto,
} from '@ap2/api-interfaces';

export function toProductGroupDto(
  entity: ProductGroupEntity | null
): ProductGroupDto | null {
  if (!entity) {
    return null;
  }

  return new ProductGroupDto(
    entity.id,
    entity.name,
    entity.description,
    entity.flags ?? [],
    entity.variants?.map((v) => new VariantDto(v.id, v.name)) ?? [],
    undefined,
    undefined,
    entity.wasteFlow?.name,
    undefined
  );
}

export function toProductGroupDtoList(
  entity: ProductGroupEntityList
): ProductGroupDto {
  return new ProductGroupDto(
    entity.id,
    entity.name,
    entity.description,
    entity.flags ?? [],
    entity.variants?.map((v) => new VariantDto(v.id, v.name)) ?? [],
    undefined,
    entity._count?.products,
    entity.wasteFlow?.name,
    undefined
  );
}
