/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import internal = require('stream');

export interface IStorageService {
  /**
   * Uploads a file to the storage service.
   * @param file The file to upload.
   * @param path The path where the file will be stored.
   * @returns A promise that resolves to the URL of the uploaded file.
   */
  uploadFile(file: Buffer, path: string, mimeType: string): Promise<string>;

  /**
   * Downloads a file from the storage service.
   * @param path The path of the file to download.
   * @returns A promise that resolves to the file content as a Buffer.
   */
  downloadFile(path: string): Promise<internal.Readable>;

  /**
   * Generates a presigned URL for accessing a file.
   * @param path The path of the file for which to generate the URL.
   * @returns A promise that resolves to the presigned URL.
   */
  getPresignedUrl(path: string): Promise<string>;

  /**
   * Deletes a file from the storage service.
   * @param path The path of the file to delete.
   * @returns A promise that resolves when the file is deleted.
   */
  deleteFile(path: string): Promise<void>;
}

export const STORAGE_SERVICE_TOKEN = 'IStorageService';
