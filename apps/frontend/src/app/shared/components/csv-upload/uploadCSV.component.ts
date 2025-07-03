/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Papa, ParseResult } from 'ngx-papaparse';
import { toast } from 'ngx-sonner';
import {
  Component,
  Input,
  model,
  ModelSignal,
  Output,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MappingsService } from '../../../core/services/mappings/mappings.service';
import { ContentType } from '../overview/table-content-type.enum';
import { CreateObjectsComponent } from './upload-mapping-dialog/create-objects.component';

@Component({
  selector: 'app-upload-csv',
  imports: [MatButtonModule, CreateObjectsComponent, MatIconModule],
  providers: [MappingsService],
  templateUrl: './uploadCSV.component.html',
})
export class UploadCSVComponent<T> {
  @Input() contentType!: ContentType;
  output: ModelSignal<any> = model(false);
  csvs: ParseResult | null = null;
  csvPreview: string[][] | null = null;
  useImport = output<boolean>();
  isDragging = false;

  constructor(private papa: Papa) {}

  public async importDataFromCSV(event: any) {
    this.useImport.emit(true);
    let files: FileList;

    if (event.type === 'drop') {
      event.preventDefault();
      files = event.dataTransfer.files;
    } else {
      files = event.target.files;
    }

    if (!files || files.length === 0) {
      return;
    }

    Array.from(files).forEach((file: File) => {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        console.error('Please upload a CSV file');
        return;
      }

      toast.promise(this.parseCSV(file), {
        loading: 'CSV wird geladen...',
        success: 'CSV wurde geladen',
        error: 'Fehler beim Laden der CSV',
      });
    });
  }

  async parseCSV(file: File) {
    return new Promise((resolve, reject) => {
      this.papa.parse(file, {
        dynamicTyping: true,
        encoding: 'UTF-8',
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          this.csvs = result;
          this.csvPreview = result.data;
          resolve(true);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }
}
