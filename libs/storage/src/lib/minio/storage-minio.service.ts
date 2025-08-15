/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationService } from '@ap2/configuration';
import { Client } from 'minio';
import { MINIO_CONNECTION } from 'nestjs-minio';
import { Inject, Injectable } from '@nestjs/common';
import { IStorageService } from '../storage-service.interface';

import internal = require('stream');

@Injectable()
export class StorageMinioService implements IStorageService {
  constructor(
    @Inject(MINIO_CONNECTION) private readonly minioClient: Client,
    private readonly config: ConfigurationService
  ) {}

  async uploadFile(
    file: Buffer,
    path: string,
    mimeType: string
  ): Promise<string> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const uploadedObjectInfo = await this.minioClient.putObject(
      this.config.getMinioConfig().bucket,
      path,
      buffer,
      buffer.length,
      {
        'Content-Type': mimeType,
        'x-amz-acl': 'public-read',
      }
    );

    return uploadedObjectInfo.etag;
  }

  async downloadFile(path: string): Promise<internal.Readable> {
    return this.minioClient.getObject(
      this.config.getMinioConfig().bucket,
      path
    );
  }

  async getPresignedUrl(path: string): Promise<string> {
    const presignedUrl = await this.minioClient.presignedGetObject(
      this.config.getMinioConfig().bucket,
      path,
      24 * 60 * 60
    );
    return presignedUrl;
  }

  async deleteFile(path: string): Promise<void> {
    await this.minioClient.removeObject(
      this.config.getMinioConfig().bucket,
      path
    );
  }
}
