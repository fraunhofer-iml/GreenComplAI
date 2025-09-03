/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class MaterialDto {
  name: string;
  materialType?: 'primary' | 'secondary';

  constructor(name: string, materialType?: 'primary' | 'secondary') {
    this.name = name;
    this.materialType = materialType;
  }
}
