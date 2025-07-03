/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { DataService } from '../../../../../core/services/data-service/data.service';
import { ProductsService } from '../../../../../core/services/products/products.service';
import { UploadCSVComponent } from '../../../csv-upload/uploadCSV.component';
import { ContentType } from '../../../overview/table-content-type.enum';

@Component({
  selector: 'app-dialog-import-part-list',
  templateUrl: 'importPartListComponent.html',
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    UploadCSVComponent,
  ],
  providers: [
    {
      provide: DataService,
      useClass: ProductsService,
    },
  ],
})
export class ImportPartListComponent {
  readonly dialogRef = inject(MatDialogRef<ImportPartListComponent>);
  itemList = signal([]);
  protected readonly ContentType = ContentType;

  constructor() {
    effect(() => {
      if (this.itemList().length > 0) this.dialogRef.close(this.itemList());
    });
  }
}
