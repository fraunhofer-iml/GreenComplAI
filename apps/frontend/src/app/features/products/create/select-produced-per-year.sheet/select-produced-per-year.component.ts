/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Input, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ONLY_YEAR_FORMAT } from '../../../../shared/constants/date-formats';

@Component({
  selector: 'app-select-produced-per-year',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatAutocompleteModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  templateUrl: './select-produced-per-year.component.html',
})
export class SelectProducedPerYearComponent {
  showSaveButton = input(false);

  @Input() form?: FormGroup<{
    producedItems: FormArray<
      FormGroup<{
        year: FormControl<Date | null>;
        amount: FormControl<number | null>;
      }>
    >;
  }>;

  @Output() closeSheetEvent = new EventEmitter<void>();
  @Output() addProducedItemEvent = new EventEmitter<void>();
  @Output() removeProducedItemEvent = new EventEmitter<number>();
  @Output() updateProductionHistoryEvent = new EventEmitter<void>();

  get producedItems() {
    return this.form?.get('producedItems') as FormArray;
  }

  fromYearHandler(event: Date, index: number, picker: MatDatepicker<Date>) {
    if (this.form && this.form.controls.producedItems) {
      this.form.controls.producedItems.controls[index].controls.year.setValue(
        new Date(event)
      );
    }
    picker.close();
  }

  save() {
    this.updateProductionHistoryEvent.emit();
    this.closeSheetEvent.emit();
  }
}
