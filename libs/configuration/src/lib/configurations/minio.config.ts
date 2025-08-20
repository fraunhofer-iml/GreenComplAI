/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerAs } from '@nestjs/config';

export const MINIO_IDENTIFIER = 'minio';

export interface MinioConfig {
  bucket: string;
  url: string;
  port: string;
  accessKey: string;
  secret: string;
  invoicePrefix: string;
  metadataPrefix: string;
  objectStorageURL: string;
}

export default registerAs(MINIO_IDENTIFIER, () => ({
  bucket: process.env['MINIO_BUCKET'] || 'greencomplai',
  url: process.env['MINIO_URL'] || 'localhost',
  port: process.env['MINIO_PORT'] || '9000',
  accessKey: process.env['MINIO_ACCESS_KEY'] || 'root',
  secret: process.env['MINIO_SECRET'] || 'rootpassword',
  objectStorageURL:
    process.env['OBJECT_STORAGE_URL'] ||
    'http://localhost:9001/buckets/greencomplai/',
}));
