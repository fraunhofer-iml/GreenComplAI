/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { MONTH_AND_YEAR_FORMAT } from '../../../constants/date-formats';

@Component({
  selector: 'app-date-picker-month-year',
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
    { provide: MAT_DATE_FORMATS, useValue: MONTH_AND_YEAR_FORMAT },
  ],
  template: `
    <div class="flex w-full gap-2">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label> <ng-content></ng-content> von</mat-label>
        <input
          matInput
          [matDatepicker]="fromPicker"
          matInput
          [formControl]="form().controls.from"
          [readonly]="disabled()" />
        <mat-datepicker-toggle
          [disabled]="disabled()"
          matSuffix
          [for]="fromPicker"
        ></mat-datepicker-toggle>
        <mat-datepicker
          #fromPicker
          startView="multi-year"
          (monthSelected)="
            dateHandler($event, fromPicker, form().controls.from)
          "
        >
        </mat-datepicker
      ></mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label> bis</mat-label>
        <input
          matInput
          [matDatepicker]="toPicker"
          matInput
          [formControl]="form().controls.to"
          [readonly]="disabled()" />
        <mat-datepicker-toggle
          [disabled]="disabled()"
          matSuffix
          [for]="toPicker"
        ></mat-datepicker-toggle>
        <mat-datepicker
          #toPicker
          startView="multi-year"
          (monthSelected)="dateHandler($event, toPicker, form().controls.to)"
        >
        </mat-datepicker
      ></mat-form-field>
    </div>
  `,
})
export class DatePickerMonthYearComponent {
  form = input.required<
    FormGroup<{
      from: FormControl<Date | null>;
      to: FormControl<Date | null>;
    }>
  >();
  disabled = input<boolean>(false);

  dateHandler(
    event: Date,
    picker: MatDatepicker<Date>,
    form: FormControl<Date | null>
  ) {
    form.patchValue(event);
    picker.close();
  }
}
