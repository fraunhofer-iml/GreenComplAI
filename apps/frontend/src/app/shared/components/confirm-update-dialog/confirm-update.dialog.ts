/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-confirm-update.dialog',
  templateUrl: 'confirm-update.dialog.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatCheckboxModule,
  ],
})
export class ConfirmUpdateDialogComponent {
  data = inject<string[]>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ConfirmUpdateDialogComponent>);

  validated: string[] = [];

  toggleItem(item: string) {
    const index = this.validated.indexOf(item);
    if (index > -1) {
      this.validated.splice(index, 1);
    } else {
      this.validated.push(item);
    }
  }

  save(confirmed: boolean): void {
    this.dialogRef.close({
      confirmed: confirmed,
      fieldsToValidate: this.validated,
    });
  }
}
