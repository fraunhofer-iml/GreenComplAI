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
import {
  Component,
  inject,
  input,
  OnChanges,
  output,
  Signal,
  SimpleChanges,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { ReportsFormsService } from '../services/goals.services';
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
  private readonly formsService = inject(ReportsFormsService);
  report = input.required<ReportDto>();
  refetchEvent = output<void>();
  goalsForm = this.formsService.getGoalsForm()();
  goalPlanningForm: FormGroup<GoalPlanningFormGroup> =
    this.formsService.getGoalPlanningForm()();
  reportsService = inject(ReportsService);

  selectedTabIndex = 0;
  Validators = Validators;

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['report']) {
      if (this.report().isFinalReport) this.disableControls();
      this.setGoalPlanningFormValue();
      this.setGoalsFormValue();
    }
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
    this.formsService.updateGoalsForm(this.report());
  }

  private setGoalPlanningFormValue() {
    const goalPlanning = this.report().goalPlanning;
    if (!goalPlanning) {
      return;
    }
    this.formsService.updateGoalPlanningForm(goalPlanning);
  }

  private updateGoalPlanning() {
    this.formsService.saveGoalPlanning(
      this.goalPlanningMutation,
      this.report()
    );
  }

  private updateGoals() {
    this.formsService.saveGoal(this.goalMutation, this.report());
  }

  private moveToLatestTab() {
    this.selectedTabIndex = this.goalsForm.controls.goals.length - 1;
  }

  private onSuccess() {
    this.refetchEvent.emit();
    toast.success('Änderungen erfolgreich gespeichert.');
  }

  private disableControls() {
    this.goalPlanningForm.controls.goalsPlanned.disable();
    this.goalPlanningForm.controls.goalsTracked.disable();
  }
}
