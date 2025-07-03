/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class MappingDto {
  key: string;
  mappingElements: MappingElementDto[];

  constructor(key: string, mappingElements: MappingElementDto[]) {
    this.key = key;
    this.mappingElements = mappingElements;
  }
}

export class MappingElementDto {
  key: string;
  value: string;

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }
}
