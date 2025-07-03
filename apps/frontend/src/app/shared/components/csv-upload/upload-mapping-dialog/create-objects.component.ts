/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AddressDto,
  CompanyCreateDto,
  MappingDto,
  MappingElementDto,
  PackagingCreateDto,
  ProductCreateDto,
} from '@ap2/api-interfaces';
import { ParseResult } from 'ngx-papaparse';
import { toast } from 'ngx-sonner';
import { from, retry } from 'rxjs';
import { Component, input, model, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data-service/data.service';
import { MappingsService } from '../../../../core/services/mappings/mappings.service';
import { UNIT_INFO_MESSAGE } from '../../../constants/messages';
import {
  getNestedObjectKeys,
  toNestedObject,
} from '../../../utils/getNestedObjectKeys';
import { ContentType } from '../../overview/table-content-type.enum';

@Component({
  selector: 'app-create-objects-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  providers: [MappingsService],
  templateUrl: 'create-objects.component.html',
})
export class CreateObjectsComponent<T> implements OnInit {
  csvs = input<ParseResult>();
  contentType = input<ContentType>();
  output = model<unknown[]>();
  mapStructure: string[] = [];
  data: MappingElementDto[] = [];

  UNIT_INFO_MESSAGE = UNIT_INFO_MESSAGE;

  constructor(
    private readonly mappingService: MappingsService,
    private readonly dataService: DataService<T>,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const csvs = this.csvs();
    if (!csvs) return;
    const headers = Object.keys(csvs.data[0]);
    const mapping = await this.mappingService.getMappings(headers.join(''));

    if (mapping) {
      this.data = mapping.mappingElements;
    } else {
      this.data = headers.map((header) => new MappingElementDto(header, ''));
    }
    if (this.contentType() === ContentType.PRODUCTS) {
      this.mapStructure = getNestedObjectKeys(
        new ProductCreateDto('', [])
      ).sort();
    } else if (this.contentType() === ContentType.COMPANIES) {
      this.mapStructure = getNestedObjectKeys(
        new CompanyCreateDto('', '', '', [new AddressDto('', '', '', '')], [])
      ).sort();
    } else if (this.contentType() === ContentType.PACKAGE) {
      this.mapStructure = getNestedObjectKeys(
        new PackagingCreateDto(0, '', 0, 0, 0, '', '', [], [])
      ).sort();
    } else if (this.contentType() === ContentType.BILLOFMATERIALS) {
      this.mapStructure = getNestedObjectKeys({
        productId: '',
        amount: 0,
        ...new ProductCreateDto('', []),
      }).sort();
    }
  }

  async saveMapping() {
    const csvs = this.csvs();
    if (!csvs) return;

    const key = Object.keys(csvs.data[0]).join('');
    const mapping = new MappingDto(
      key,
      this.data.filter((el) => el.value !== null)
    );

    await this.mappingService.createMapping(mapping);
    this.createEntries(csvs, mapping);
  }

  private createEntries(result: ParseResult, mapping: MappingDto) {
    const resultList: unknown[] = [];
    result.data.forEach((element: any) => {
      const createDto = mapping.mappingElements.reduce((dto, map) => {
        if (element[map.key]) {
          return toNestedObject(map.value, element[map.key], dto);
        }
        return dto;
      }, {});
      if (!this.output()) {
        from(this.dataService.create(createDto))
          .pipe(
            retry({
              count: 3,
              delay: 3000,
            })
          )
          .subscribe({
            next: () => {
              toast.success('Eintrag erfolgreich erstellt');
            },
            error: (err) => {
              toast.error(
                `${err.error.statusCode}: Fehler beim Erstellen des Eintrags: ${JSON.stringify(createDto)}`
              );
            },
          });
      }
      resultList.push(createDto);
    });

    if (!this.output()) this.router.navigate([this.contentType()]);
    else this.output.set(resultList);
  }
}
