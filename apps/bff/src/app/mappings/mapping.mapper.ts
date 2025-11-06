/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MappingDto,
  MappingElementDto,
  MappingEntity,
} from '@ap2/api-interfaces';

export function toMappingDto(entity: MappingEntity | null): MappingDto | null {
  if (!entity) {
    return null;
  }

  return new MappingDto(
    entity.key,
    entity.mappingElements.map((el) => new MappingElementDto(el.key, el.value))
  );
}
