/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalDto, GoalPlanningDto, ReportDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { Component, inject, input, OnChanges, output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../core/services/reports/reports.service';
import { DatePickerMonthYearComponent } from '../../../../shared/components/date-picker/date-picker-month-year.component';
import {
  GoalPlanningFormGroup,
  newGoalPlanningFormGroup,
} from './goal-planning.form';
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
    MatDatepickerModule,
    MatCheckboxModule,
    MatTabsModule,
    DatePickerMonthYearComponent,
    TextFieldModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './goal-information.component.html',
})
export class GoalInformationComponent implements OnChanges {
  report = input.required<ReportDto>();
  refetchEvent = output<void>();
  goalsFormGroup = new FormGroup<{ goals: FormArray<GoalForm> }>({
    goals: new FormArray<GoalForm>([]),
  });
  form: FormGroup<GoalPlanningFormGroup> = newGoalPlanningFormGroup();
  reportsService = inject(ReportsService);

  selectedTabIndex = 0;

  goalPlanningMutation = injectMutation(() => ({
    mutationFn: (props: { planning: GoalPlanningDto; id: string }) =>
      this.reportsService.updateGoalPlanning(props.planning, props.id),
    onSuccess: () => this.onSuccess(),
    onError: () => toast('Speichern fehlgeschlagen'),
  }));

  goalMutation = injectMutation(() => ({
    mutationFn: (props: { goals: GoalDto[]; id: string }) =>
      this.reportsService.updateGoals(props.goals, props.id),
    onSuccess: () => this.onSuccess(),
    onError: () => toast('Speichern fehlgeschlagen'),
  }));

  addGoal(): void {
    this.goalsFormGroup.controls.goals.push(newGoalForm(this.report()));
    this.moveToLatestTab();
  }

  removeGoal(index: number): void {
    this.goalsFormGroup.controls.goals.removeAt(index);
    this.moveToLatestTab();
  }

  ngOnChanges(): void {
    this.goalsFormGroup.controls.goals.clear();
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

    this.report().goals.forEach((g) => {
      const newForm = newGoalForm(this.report());
      const strategiesWithConnections = this.report()?.strategies.map((s) => {
        const item = g.strategies.find((item) => item.id === s.id);
        return {
          strategy: s,
          selected: !!item,
          connection: item?.connection,
        };
      });

      newForm.patchValue({
        ...g,
        referenceYear: new Date(g.referenceYear, 1, 1),
        validityPeriod: {
          from: g.validityPeriodStart,
          to: g.validityPeriodEnd,
        },
        strategies: strategiesWithConnections,
      });

      this.goalsFormGroup.controls.goals.push(newForm);
    });
  }

  save() {
    if (this.goalsFormGroup.controls.goals.length === 0)
      this.updateGoalPlanning();
    else this.updateGoals();
  }

  private updateGoalPlanning() {
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
    } as GoalPlanningDto;

    this.goalPlanningMutation.mutate({ planning: dto, id: this.report().id });
  }

  private updateGoals() {
    const dto = this.goalsFormGroup.value.goals?.map((goal) => {
      const { validityPeriod, ...data } = goal;
      const strategies: { id: string; connection: string }[] = [];
      goal.strategies?.forEach((s) => {
        if (s.selected && s.strategy?.id)
          strategies.push({
            id: s.strategy.id,
            connection: s.connection ?? '',
          });
      });

      return {
        ...data,
        validityPeriodStart: validityPeriod?.from,
        validityPeriodEnd: validityPeriod?.to,
        strategies: strategies,
        referenceYear: data.referenceYear?.getFullYear(),
      };
    }) as GoalDto[];

    this.goalMutation.mutate({ goals: dto, id: this.report().id });
  }

  private moveToLatestTab() {
    this.selectedTabIndex = this.goalsFormGroup.controls.goals.length - 1;
  }

  private onSuccess() {
    this.refetchEvent.emit();
    toast.success('Änderungen erfolgreich gespeichert.');
  }
}
