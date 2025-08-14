/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TextFieldModule } from '@angular/cdk/text-field';
import {
  Component,
  input,
  OnChanges,
  output,
  SimpleChanges,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { DatePickerMonthYearComponent } from '../../../../../shared/components/date-picker/date-picker-month-year.component';
import { DatePickerYearOnlyComponent } from '../../../../../shared/components/date-picker/date-picker-year-only.component';
import { ConnectedStrategiesForm, GoalForm } from '../forms/goal.forms';

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
    MatRadioModule,
    DatePickerYearOnlyComponent,
    DatePickerMonthYearComponent,
    TextFieldModule,
  ],
  templateUrl: './goals.component.html',
})
export class GoalsComponent implements OnChanges {
  isFinal = input<boolean>(false);
  removeEvent = output<void>();
  form = input.required<GoalForm>();
  Validators = Validators;

  get strategies(): FormArray<FormGroup<ConnectedStrategiesForm>> {
    return this.form().get('strategies') as FormArray;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isFinal'] && this.isFinal()) this.disableControls();
  }

  updateValue() {
    this.strategies.updateValueAndValidity();
    this.form().updateValueAndValidity();
  }

  getSelectedStrategies(forms: FormGroup<ConnectedStrategiesForm>[]) {
    return forms
      .filter((f) => f.controls.selected.value)
      .map((f) => ({
        strategy: f.value.strategy?.name,
        connection: f.value?.connection ?? 'Keine Angabe',
      }));
  }

  private disableControls() {
    this.form().controls.hasEcologicalImpact.disable();
    this.form().controls.isScientificReferenced.disable();
    this.form().controls.isRelative.disable();
    this.form().controls.stakeholderInclusion.disable();
    this.form().controls.wasteHLevel.disable();
  }
}
