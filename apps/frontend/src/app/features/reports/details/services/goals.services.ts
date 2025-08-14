/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalDto, GoalPlanningDto, ReportDto } from '@ap2/api-interfaces';
import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CreateMutationResult } from '@tanstack/angular-query-experimental';
import {
  addValidatorsToFormGroup,
  removeOptionalGoalValidators,
  removeValidatorsFromOptionalFields,
} from '../goal-informations/forms/goal-form.util';
import {
  GoalPlanningFormGroup,
  newGoalPlanningFormGroup,
} from '../goal-informations/forms/goal-planning.form';
import { GoalForm, newGoalForm } from '../goal-informations/forms/goal.forms';

@Injectable()
export class ReportsFormsService {
  goalPlanningForm: WritableSignal<FormGroup<GoalPlanningFormGroup>> = signal<
    FormGroup<GoalPlanningFormGroup>
  >(newGoalPlanningFormGroup(false));

  goalsForm: WritableSignal<
    FormGroup<{
      goals: FormArray<GoalForm>;
    }>
  > = signal<
    FormGroup<{
      goals: FormArray<GoalForm>;
    }>
  >(
    new FormGroup<{ goals: FormArray<GoalForm> }>({
      goals: new FormArray<GoalForm>([]),
    })
  );

  setGoalPlanningForm(form: FormGroup<GoalPlanningFormGroup>): void {
    this.goalPlanningForm.apply(form);
  }

  setGoalsForm(form: FormGroup<{ goals: FormArray<GoalForm> }>): void {
    this.goalsForm.apply(form);
  }

  getGoalPlanningForm(): Signal<FormGroup<GoalPlanningFormGroup>> {
    return this.goalPlanningForm;
  }

  getGoalsForm(): Signal<FormGroup<{ goals: FormArray<GoalForm> }>> {
    return this.goalsForm;
  }

  updateGoalsForm(report: ReportDto): void {
    this.goalsForm().controls.goals.clear();
    report.goals.forEach((g) => {
      const newForm = newGoalForm(report);
      const strategiesWithConnections = report.strategies.map((s) => {
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

      this.goalsForm().controls.goals.push(newForm);
    });
  }

  updateGoalPlanningForm(goalPlanning: GoalPlanningDto): void {
    this.goalPlanningForm().patchValue({
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

  saveGoal(
    goalMutation: CreateMutationResult<
      GoalPlanningDto,
      Error,
      {
        goals: GoalDto[];
        id: string;
      },
      unknown
    >,
    report: ReportDto
  ): void {
    const dto = this.goalsForm().value.goals?.map((goal) => {
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

    goalMutation.mutate({ goals: dto, id: report.id });
  }

  saveGoalPlanning(
    mutation: CreateMutationResult<
      GoalPlanningDto,
      Error,
      { planning: GoalPlanningDto; id: string },
      unknown
    >,
    report: ReportDto
  ): void {
    const goalPlanningForm = this.goalPlanningForm();
    const dto = {
      ...goalPlanningForm.value,
      id: report.goalPlanning?.id,
      deadlineEnd: goalPlanningForm.value.deadline?.to,
      deadlineStart: goalPlanningForm.value.deadline?.from,
      referencePeriodForProgressStart:
        goalPlanningForm.value.referencePeriodForProgression?.from,
      referencePeriodForProgressEnd:
        goalPlanningForm.value.referencePeriodForProgression?.to,
      hasPlannedGoals: goalPlanningForm.value.goalsPlanned,
      goalsTracked: goalPlanningForm.value.goalsTracked,
      progressEvaluation: goalPlanningForm.value.progression,
    } as GoalPlanningDto;

    mutation.mutate({ planning: dto, id: report.id });
  }

  validateGoalFormOnReportClose(): boolean {
    addValidatorsToFormGroup(this.goalPlanningForm());
    removeValidatorsFromOptionalFields(this.goalPlanningForm());

    this.goalsForm().controls.goals.controls.forEach((goalForm) => {
      addValidatorsToFormGroup(goalForm);
      removeOptionalGoalValidators(goalForm);
    });

    if (this.goalsForm().controls.goals.length === 0) {
      return this.goalPlanningForm().valid;
    } else {
      return this.goalsForm().valid;
    }
  }
}
