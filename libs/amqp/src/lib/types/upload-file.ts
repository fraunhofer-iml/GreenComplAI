/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentType } from '@ap2/api-interfaces';

export type UploadFileRequest = {
  file: Buffer;
  productId: string;
  type: DocumentType;
  mimeType: string;
  fileName: string;
};
