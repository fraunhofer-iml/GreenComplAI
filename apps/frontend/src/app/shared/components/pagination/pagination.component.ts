/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule, MatFormFieldModule, MatButtonModule, MatSelectModule],
  providers: [],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  @Input() page = 0;
  @Input() pageSize = 0;
  @Input() totalPages = 0;
  @Output() pageChange: EventEmitter<number> = new EventEmitter();
  @Output() pageSizeChange: EventEmitter<number> = new EventEmitter();

  changePage(page: number) {
    this.pageChange.emit(page);
  }

  changePageSize(event: MatSelectChange) {
    this.pageSizeChange.emit(event.value);
  }
}
