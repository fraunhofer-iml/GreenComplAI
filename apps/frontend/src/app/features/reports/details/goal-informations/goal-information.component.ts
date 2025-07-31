/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalReportDto, ReportDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { Component, inject, input, OnInit, output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  MatDatepickerModule,
  MatDateRangeInput,
} from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../core/services/reports/reports.service';
import { GoalForm, newGoalForm } from './goal.forms';
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
    MatTabsModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './goal-information.component.html',
})
export class GoalInformationComponent implements OnInit {
  report = input.required<ReportDto>();
  refetchEvent = output<void>();
  goalsFormGroup = new FormGroup<{ goals: FormArray<GoalForm> }>({
    goals: new FormArray<GoalForm>([]),
  });

  form = new FormGroup({
    followUpProcedure: new FormControl<string | null>(null),
    targets: new FormControl<string | null>(null),
    progression: new FormControl<string | null>(null),
    referencePeriodForProgression: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    deadline: new FormGroup({
      from: new FormControl<Date | null>(null),
      to: new FormControl<Date | null>(null),
    }),
    goalsPlanned: new FormControl<boolean | null>(null),
    goalsTracked: new FormControl<boolean | null>(null),
    noGoalsExplanation: new FormControl<string | null>(null),
  });
  reportsService = inject(ReportsService);

  selectedTabIndex = 0;

  goalPlanningMutation = injectMutation(() => ({
    mutationFn: (props: { planning: GoalReportDto; id: string }) =>
      this.reportsService.updateGoalPlanning(props.planning, props.id),
    onSuccess: () => this.refetchEvent.emit(),
    onError: () => toast('Speichern fehlgeschlagen'),
  }));

  addGoal(): void {
    this.goalsFormGroup.controls.goals.push(newGoalForm());
  }

  removeGoal(index: number): void {
    this.goalsFormGroup.controls.goals.removeAt(index);
  }

  updateGoal(index: number, event: any): void {
    this.goalsFormGroup.controls.goals.at(index).patchValue(event);
  }

  ngOnInit(): void {
    const goalPlanning = this.report().goalPlanning;
    this.form.patchValue({
      ...goalPlanning,
      deadline: {
        from: goalPlanning?.deadlineStart,
        to: goalPlanning?.deadlineEnd,
      },
      referencePeriodForProgression: {
        from: goalPlanning?.referencePeriodForProgressStart,
        to: goalPlanning?.referencePeriodForProgressEnd,
      },
      goalsPlanned: goalPlanning?.hasPlannedGoals,
      goalsTracked: goalPlanning?.goalsTracked,
      progression: goalPlanning?.progressEvaluation,
    });
  }

  save() {
    const dto = {
      ...this.form.value,
      id: this.report().goalPlanning?.id,
      deadlineEnd: this.form.value.deadline?.to,
      deadlineStart: this.form.value.deadline?.from,
      referencePeriodForProgressStart:
        this.form.value.referencePeriodForProgression?.from,
      referencePeriodForProgressEnd:
        this.form.value.referencePeriodForProgression?.to,
      hasPlannedGoals: this.form.value.goalsPlanned,
      goalsTracked: this.form.value.goalsTracked,
      progressEvaluation: this.form.value.progression,
    } as GoalReportDto;

    this.goalPlanningMutation.mutate({ planning: dto, id: this.report().id });
  }
}
