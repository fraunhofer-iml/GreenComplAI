/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DataService } from '../../../core/services/data-service/data.service';
import { TableProps } from './model/table-props.type';
import { TABLE_PROPS } from './table-columns';
import { ContentType } from './table-content-type.enum';

@Component({
  selector: 'app-overview',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSortModule,
  ],
  templateUrl: './overview.component.html',
})
export class OverviewComponent<T> implements OnInit {
  @Input() contentType!: ContentType;
  totalLength = 100;
  pageSize = 10;
  pageIndex = 0;
  filter = '';
  sorting = {};
  tableProperties: TableProps = {
    columns: [],
    headers: [],
  };
  protected readonly encodeURIComponent = encodeURIComponent;

  constructor(private readonly dataService: DataService<T>) {}

  _additionals: Map<string, string> = new Map();

  @Input() set additionals(value: Map<string, string>) {
    if (
      !this._additionals ||
      this._additionals.size !== value.size ||
      [...value].some(([key, val]) => val !== this._additionals.get(key))
    ) {
      this._additionals = value;
      this.query.refetch();
    }
  }

  query = injectQuery(() => ({
    queryKey: [this.contentType],
    queryFn: () =>
      this.dataService.fetchData(
        this.pageIndex + 1,
        this.pageSize,
        this.filter,
        JSON.stringify(this.sorting),
        this._additionals
      ),
  }));

  ngOnInit() {
    this.tableProperties = TABLE_PROPS.get(this.contentType) ?? {
      columns: [],
      headers: [],
    };
  }

  updateTable(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.query.refetch();
  }

  onFilterChange(value: string) {
    this.filter = value;
    this.query.refetch();
  }

  onSortChange(value: Sort) {
    this.sorting = {
      [value.active]: value.direction,
    };
    this.query.refetch();
  }
}
