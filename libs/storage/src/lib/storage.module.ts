/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule, ConfigurationService } from '@ap2/configuration';
import { NestMinioModule } from 'nestjs-minio';
import { Module } from '@nestjs/common';
import { StorageMinioService } from './minio/storage-minio.service';
import { STORAGE_SERVICE_TOKEN } from './storage-service.interface';

@Module({
  imports: [
    ConfigurationModule,
    NestMinioModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => ({
        isGlobal: true,
        endPoint: config.getMinioConfig().url,
        port: Number(config.getMinioConfig().port),
        useSSL: false,
        accessKey: config.getMinioConfig().accessKey,
        secretKey: config.getMinioConfig().secret,
      }),
    }),
  ],
  providers: [
    {
      provide: STORAGE_SERVICE_TOKEN,
      useClass: StorageMinioService,
    },
  ],
  exports: [STORAGE_SERVICE_TOKEN],
})
export class StorageModule {}
