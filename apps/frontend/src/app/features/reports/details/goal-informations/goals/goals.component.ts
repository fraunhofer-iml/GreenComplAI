/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportDto } from '@ap2/api-interfaces';
import { Component, input, OnInit, output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { YearlyDatepickerComponent } from '../datePicker/YearDatePicker.component';
import { goalForm, newGoalForm } from '../goal.forms';


@Component({
  selector: 'app-goals',
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatExpansionModule,
    MatListModule,
    MatCheckboxModule,
    MatDatepickerModule,
    YearlyDatepickerComponent, // Custom datepicker component for selecting only the year, needed because of a dual datepicker format was needed
    MatRadioModule
  ],
  templateUrl: './goals.component.html',
})
export class GoalsComponent implements OnInit {
  report = input<ReportDto>();
  refetchEvent = output<any>()
  form: goalForm;

  constructor() {
    this.form = newGoalForm()
    this.form.valueChanges.subscribe((value:any) => {
      console.log(value)
      this.refetchEvent.emit(value)
    });
  }

  ngOnInit(): void {
    if (this.report()?.strategies) {
      this.report()?.strategies.forEach(() => {
        this.form.controls.strategies.push(
          new FormGroup({
            strategy: new FormControl<string | null>(null),
            connection: new FormControl<string | null>(null),
          })
        );
      });
    }
  }

}
