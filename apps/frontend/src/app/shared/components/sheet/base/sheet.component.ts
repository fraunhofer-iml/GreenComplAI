/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ISheet } from './sheet.interface';

@Component({
  selector: 'app-base-sheet',
  imports: [CommonModule],
  templateUrl: './sheet.component.html',
})
export class BaseSheetComponent implements ISheet {
  visible = false;
  private previousTimeout: ReturnType<typeof setTimeout> | undefined;
  readonly closing$ = new Subject<boolean>();

  open() {
    this.visible = true;
  }

  close() {
    this.closing$.next(true);
    if (this.previousTimeout) {
      clearTimeout(this.previousTimeout);
    }
    this.previousTimeout = setTimeout(() => {
      this.visible = false;
    }, 300);
  }
}
