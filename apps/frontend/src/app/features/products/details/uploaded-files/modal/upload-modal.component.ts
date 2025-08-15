/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentType } from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';

export interface DialogData {
  file: File;
  type: DocumentType;
}

@Component({
  selector: 'app-product-upload-modal',
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    MatInputModule,
    CommonModule,
  ],
  templateUrl: './upload-modal.component.html',
})
export class UploadModalComponent {
  readonly dialogRef = inject(MatDialogRef<UploadModalComponent>);

  formGroup: FormGroup = new FormGroup({
    documentType: new FormControl(null, Validators.required),
    documentName: new FormControl(null, Validators.required),
    file: new FormControl(null, Validators.required),
  });

  onNoClick(): void {
    this.dialogRef.close();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.formGroup.patchValue({ file });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files) return;
    const file = target.files[0];

    this.formGroup.patchValue({
      file: file,
      documentName: file.name,
    });
  }

  submitDocument(): void {
    if (this.formGroup.invalid) {
      return;
    }

    const file = this.formGroup.get('file')?.value;
    const type = this.formGroup.get('documentType')?.value;
    const fileName = this.formGroup.get('documentName')?.value;

    if (!file || !type) {
      return;
    }

    this.dialogRef.close({
      file,
      type,
      fileName,
    });
  }
}
