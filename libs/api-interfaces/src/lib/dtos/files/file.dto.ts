/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentType } from '../../types';

export class FileDto {
  id: string;
  path: string;
  type: DocumentType;

  constructor(id: string, path: string, type: DocumentType) {
    this.id = id;
    this.path = path;
    this.type = type;
  }
}
