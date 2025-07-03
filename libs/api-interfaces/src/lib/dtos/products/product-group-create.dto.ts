/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class ProductGroupCreateDto {
  name: string;
  description: string;
  wasteFlow?: string;
  variants?: string[];
  flags: string[];

  constructor(
    name: string,
    description: string,
    flags: string[],
    wasteFlow?: string,
    variants?: string[]
  ) {
    this.name = name;
    this.description = description;
    this.wasteFlow = wasteFlow;
    this.variants = variants;
    this.flags = flags;
  }
}
