/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportDto, StrategyDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';

import { Component, inject, input, OnChanges, output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../core/services/reports/reports.service';
import { ReportTooltip } from '../report-information/tooltips';
import {
  addStrategyFormGroup,
  removeStrategyGroup,
  strategiesFormArrayGroup,
  strategyFormGroup,
} from './strategies.form-group';
import { StrategyForm } from './strategy.form';

@Component({
  selector: 'app-strategies',
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatChipsModule
],
  templateUrl: './strategies.component.html',
})
export class StrategiesComponent implements OnChanges {
  form: FormGroup<{
    strategies: FormArray<StrategyForm>;
  }>;
  report = input.required<ReportDto>();

  reportsService = inject(ReportsService);
  ReportTooltip = ReportTooltip;
  refetchEvent = output<void>();

  ngOnChanges(): void {
    if (this.report()) {
      this.setStrategiesFormData(this.report());
    }
  }

  constructor() {
    this.form = strategiesFormArrayGroup();
  }

  setStrategiesFormData(dto: ReportDto) {
    if (dto.isFinalReport || dto.strategies.length !== 0)
      this.form?.controls.strategies.clear();

    dto.strategies.forEach((s) => {
      const form = strategyFormGroup();
      form.patchValue(s);
      this.form?.controls.strategies.push(form);
    });
  }
  addStrategyFormGroup = addStrategyFormGroup;
  removeStrategyGroup = removeStrategyGroup;

  updateMutation = injectMutation(() => ({
    mutationFn: (props: { strategies: StrategyDto[]; id: string }) =>
      this.reportsService.updateStrategies(props.strategies, props.id),
    onSuccess: () => this.refetchEvent.emit(),
    onError: () => toast('Speichern fehlgeschlagen'),
  }));

  save() {
    let strategies: StrategyDto[] =
      this.form.value.strategies?.map((s) => s as StrategyDto) ?? [];
    strategies = strategies.filter((s) => s.name);

    this.updateMutation.mutate({
      strategies: strategies,
      id: this.report().id,
    });
  }

  get strategies() {
    return this.form?.get('strategies') as FormArray;
  }
}
