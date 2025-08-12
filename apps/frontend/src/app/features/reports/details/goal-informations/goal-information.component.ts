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
import { MatBadgeModule } from '@angular/material/badge';
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
  addValidatorsToFormGroup,
  removeOptionalGoalValidators,
  removeValidatorsFromOptionalFields,
} from './forms/goal-form.util';
import {
  GoalPlanningFormGroup,
  newGoalPlanningFormGroup,
} from './forms/goal-planning.form';
import { GoalForm, newGoalForm } from './forms/goal.forms';
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
    MatBadgeModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './goal-information.component.html',
})
export class GoalInformationComponent implements OnChanges {
  report = input.required<ReportDto>();
  refetchEvent = output<void>();
  goalsValid = output<boolean>();
  validationRequired = input<boolean>(false);
  goalsForm = new FormGroup<{ goals: FormArray<GoalForm> }>({
    goals: new FormArray<GoalForm>([]),
  });
  goalPlanningForm: FormGroup<GoalPlanningFormGroup> =
    newGoalPlanningFormGroup();
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

  ngOnChanges(): void {
    this.setGoalPlanningFormValue();
    this.setGoalsFormValue();
    if (this.validationRequired()) this.addAllValidators();
  }

  addGoal(): void {
    this.goalsForm.controls.goals.push(newGoalForm(this.report()));
    this.moveToLatestTab();
  }

  removeGoal(index: number): void {
    this.goalsForm.controls.goals.removeAt(index);
    this.moveToLatestTab();
  }

  save() {
    if (this.goalsForm.controls.goals.length === 0) this.updateGoalPlanning();
    else this.updateGoals();
  }

  private setGoalsFormValue() {
    this.goalsForm.controls.goals.clear();
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

      this.goalsForm.controls.goals.push(newForm);
    });
  }

  private setGoalPlanningFormValue() {
    const goalPlanning = this.report().goalPlanning;
    this.goalPlanningForm.patchValue({
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
      progression: goalPlanning?.progressEvaluation,
    });
  }

  private updateGoalPlanning() {
    const dto = {
      ...this.goalPlanningForm.value,
      id: this.report().goalPlanning?.id,
      deadlineEnd: this.goalPlanningForm.value.deadline?.to,
      deadlineStart: this.goalPlanningForm.value.deadline?.from,
      referencePeriodForProgressStart:
        this.goalPlanningForm.value.referencePeriodForProgression?.from,
      referencePeriodForProgressEnd:
        this.goalPlanningForm.value.referencePeriodForProgression?.to,
      hasPlannedGoals: this.goalPlanningForm.value.goalsPlanned,
      goalsTracked: this.goalPlanningForm.value.goalsTracked,
      progressEvaluation: this.goalPlanningForm.value.progression,
    } as GoalPlanningDto;

    this.goalPlanningMutation.mutate({ planning: dto, id: this.report().id });
  }

  private updateGoals() {
    const dto = this.goalsForm.value.goals?.map((goal) => {
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
    this.selectedTabIndex = this.goalsForm.controls.goals.length - 1;
  }

  private onSuccess() {
    this.refetchEvent.emit();
    toast.success('Änderungen erfolgreich gespeichert.');
  }

  addAllValidators() {
    addValidatorsToFormGroup(this.goalPlanningForm);
    removeValidatorsFromOptionalFields(this.goalPlanningForm);

    this.goalsForm.controls.goals.controls.forEach((goalForm) => {
      addValidatorsToFormGroup(goalForm);
      removeOptionalGoalValidators(goalForm);
    });

    if (this.goalsForm.controls.goals.length === 0)
      this.goalsValid.emit(this.goalPlanningForm.valid);
    else this.goalsValid.emit(this.goalsForm.valid);
  }
}
