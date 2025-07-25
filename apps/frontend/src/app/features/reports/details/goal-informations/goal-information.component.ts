/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalReportDto, ReportDto } from '@ap2/api-interfaces';
import { Component, input, output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule, MatDateRangeInput } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { goalForm, newGoalForm } from './goal.forms';
import { GoalsComponent } from './goals/goals.component';


@Component({
  selector: 'app-goal-information',
  imports: [
    GoalsComponent,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    ReactiveFormsModule,
    MatInput,
    MatDateRangeInput,
    MatDatepickerModule,
    MatCheckboxModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './goal-information.component.html',
})
export class GoalInformationComponent {
  report = input.required<ReportDto>();
  refetchEvent = output<any>();
  form = new FormGroup({
    followUpProcedure: new FormControl<string | null>(null),
    targets: new FormControl<string | null>(null),
    progression: new FormControl<string | null>(null),
    referencePeriodForProgression: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    validDate: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    goalsPlanned: new FormControl<string | null>(null),
    noGoalsExplanation: new FormControl<string | null>(null),
    goals: new FormArray<goalForm>([]),
  });

  addGoal(): void {
    const goals = this.form.controls.goals as FormArray<goalForm>;
    goals.push(newGoalForm());
  }

  removeGoal(index: number): void {
    const goals = this.form.controls.goals as FormArray<goalForm>;
    goals.removeAt(index);
  }

  updateGoal(index: number, event: any): void {
    this.form.controls.goals.at(index).patchValue(event);
  }

  save() {
    //@Todo DTO builden und definieren und dann speichern
      const goals = new GoalReportDto()
  }
}
