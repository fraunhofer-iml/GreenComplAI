/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ONLY_YEAR_FORMAT } from '../../constants/date-formats';

@Component({
  selector: 'app-date-picker-year-only',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  template: `<mat-form-field appearance="outline" class="h-full w-full">
    <mat-label> <ng-content></ng-content> </mat-label>
    <input matInput [matDatepicker]="fromPicker" [formControl]="form()" />
    <mat-datepicker-toggle
      matSuffix
      [for]="fromPicker"
      [disabled]="disabled()"
    ></mat-datepicker-toggle>
    <mat-datepicker
      #fromPicker
      startView="multi-year"
      (yearSelected)="yearHandler($event, fromPicker)"
    >
    </mat-datepicker>
  </mat-form-field>`,
})
export class DatePickerYearOnlyComponent {
  form = input.required<FormControl<Date | null>>();
  disabled = input<boolean>(false);

  yearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.form().patchValue(event);
    picker.close();
  }
}
