/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentType, documentTypeToLabel } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { ProductsService } from '../../../../core/services/products/products.service';
import { UploadModalComponent } from './modal/upload-modal.component';

@Component({
  selector: 'app-product-uploaded-files',
  imports: [RouterModule, MatButtonModule, MatIconModule, MatButtonModule],
  templateUrl: './uploaded-files.component.html',
})
export class UploadedFilesComponent {
  productId = input<string>();

  private readonly productService = inject(ProductsService);
  readonly dialog = inject(MatDialog);

  filesQuery = injectQuery(() => ({
    queryKey: ['productFiles', this.productId()],
    queryFn: () => {
      const productId = this.productId();
      if (!productId) {
        return [];
      }
      return this.productService.getFiles(productId);
    },
    enabled: !!this.productId(),
  }));

  uploadMutation = injectMutation(() => ({
    mutationFn: (data: {
      file: File;
      type: DocumentType;
      fileName: string;
    }) => {
      const productId = this.productId();
      if (!productId) {
        throw new Error('Product ID is required for file upload');
      }

      return this.productService.uploadFile(
        productId,
        data.file,
        data.type,
        data.fileName
      );
    },
    onSuccess: () => {
      toast.success('Datei erfolgreich hochgeladen');
      this.filesQuery.refetch();
    },
  }));

  deleteMutation = injectMutation(() => ({
    mutationFn: (fileId: string) => {
      const productId = this.productId();
      if (!productId) {
        throw new Error('Product ID is required for file deletion');
      }
      return this.productService.deleteFile(productId, fileId);
    },
    onSuccess: () => {
      toast.success('Datei erfolgreich gelöscht');
      this.filesQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Fehler beim Löschen der Datei:', error);
      toast.error('Fehler beim Löschen der Datei');
    },
  }));

  downloadMutation = injectMutation(() => ({
    mutationFn: (path: string) => {
      const productId = this.productId();
      if (!productId) {
        throw new Error('Product ID is required for file deletion');
      }

      return this.productService.downloadFile(productId, path);
    },
    onSuccess: ({ url }: { url: string }) => {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Datei erfolgreich heruntergeladen');
    },
    onError: (error: any) => {
      console.error('Fehler beim Herunterladen der Datei:', error);
      toast.error('Fehler beim Herunterladen der Datei');
    },
  }));

  getDocumentTypeLabel(type: DocumentType): string {
    return documentTypeToLabel[type] || 'Unbekannt';
  }

  onClickAddButton(): void {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '50%',
      maxWidth: '600px',
    });

    dialogRef
      .afterClosed()
      .subscribe(
        (result: { file: File; type: DocumentType; fileName: string }) => {
          if (!result) {
            return;
          }

          this.uploadMutation.mutate({
            file: result.file,
            type: result.type,
            fileName: result.fileName,
          });
        }
      );
  }

  onClickDeleteButton(fileId: string): void {
    this.deleteMutation.mutate(fileId);
  }

  onClickDownloadButton(path: string): void {
    this.downloadMutation.mutate(path);
  }
}
