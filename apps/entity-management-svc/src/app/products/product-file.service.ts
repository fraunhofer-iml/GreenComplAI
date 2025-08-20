/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import internal from 'stream';
import { PrismaService } from '@ap2/database';
import { v4 as uuid } from 'uuid';
import { IStorageService, STORAGE_SERVICE_TOKEN } from '@greencomplai/storage';
import { Inject, Injectable } from '@nestjs/common';
import { DocumentType, GCFile } from '@prisma/client';

@Injectable()
export class ProductFileService {
  constructor(
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly minioService: IStorageService,
    private prismaService: PrismaService
  ) {}

  async uploadProductFile(
    file: Buffer,
    fileName: string,
    productId: string,
    type: DocumentType,
    mimeType: string
  ): Promise<string> {
    const fileType = mimeType.split('/')[1];
    const cleanFileName = fileName.split('.')[0];
    const path = `products/${productId}/${cleanFileName}.${fileType}`;
    await this.minioService.uploadFile(file, path, mimeType);
    await this.prismaService.gCFile.create({
      data: {
        path,
        type,
        product: {
          connect: { id: productId },
        },
      },
    });
    return path;
  }

  async downloadProductFile(path: string): Promise<string> {
    return await this.minioService.getPresignedUrl(path);
  }

  async deleteProductFile(productId: string, fileId: string): Promise<void> {
    const file = await this.prismaService.gCFile.findUnique({
      where: { id: fileId, productId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    await this.minioService.deleteFile(file.path);
    await this.prismaService.gCFile.delete({ where: { id: fileId } });
  }

  async getProductFiles(productId: string): Promise<GCFile[]> {
    return this.prismaService.gCFile.findMany({
      where: { productId },
    });
  }
}
