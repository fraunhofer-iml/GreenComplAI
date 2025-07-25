/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, input } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ONLY_YEAR_FORMAT } from '../../../../../shared/constants/date-formats';
import { MomentDateAdapter } from '@angular/material-moment-adapter';

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [MatDatepickerModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  template: `
    <mat-form-field
      appearance="outline"
      class="m-2 w-full"
    >
      <ng-content></ng-content>
      <input
        [value]="form().value"
        matInput
        [matDatepicker]="fromPicker"
        [formControl]="form()"
      />
      <mat-datepicker-toggle
        [disabled]=disabled()
        matSuffix
        [for]="fromPicker"
      ></mat-datepicker-toggle>
      <mat-datepicker
        #fromPicker
        startView="multi-year"
        (yearSelected)="yearHandler($event, fromPicker)"
      >
      </mat-datepicker>
    </mat-form-field>
  `,
})
export class YearlyDatepickerComponent {
  form = input.required<FormControl<Date | null>>();
  disabled = input<boolean>(false);
  yearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.form().setValue(new Date(event));
    picker.close();
  }
}
