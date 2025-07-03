/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FinancialImpactCreateDto,
  FinancialImpactDto,
  ImpactType,
  ReportDto,
} from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { Component, inject, input, OnChanges, output } from '@angular/core';
import {
  FormArray,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../../core/services/reports/reports.service';
import { BaseSheetComponent } from '../../../../../shared/components/sheet/base/sheet.component';
import {
  criticalAssumptionFormGroup,
  criticalAssumptionsFormArrayGroup,
} from '../update/criticalAssumptions.form-group';
import { UpdateFinancialImpactComponent } from '../update/update-financial-impact.component';
import {
  addFinancialImpactsFormGroup,
  financialImpactsFormArrayGroup,
  financialImpactsFormGroup,
  removeFinancialImpactsFormGroup,
} from './financial-impacts.form-group';
import { CriticalAssumptionForm, FinancialImpactForm } from './impact.form';

@Component({
  selector: 'app-financial-impact',
  imports: [
    CommonModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatIconModule,
    FormsModule,
    MatOptionModule,
    MatSelectModule,
    TextFieldModule,
    MatButtonModule,
    MatExpansionModule,
    MatListModule,
    MatBadgeModule,
    BaseSheetComponent,
    UpdateFinancialImpactComponent,
  ],
  templateUrl: './financial-impact.component.html',
})
export class FinancialImpactComponent implements OnChanges {
  form: FormGroup<{
    impacts: FormArray<FinancialImpactForm>;
  }>;

  selectedAssumptionIndex = 0;

  report = input.required<ReportDto>();
  refetchEvent = output<void>();

  reportsService = inject(ReportsService);

  updateMutation = injectMutation(() => ({
    mutationFn: (props: { dtos: FinancialImpactCreateDto[]; id: string }) =>
      this.reportsService.updateFinancialImpacts(props.dtos, props.id),
    onSuccess: () => this.refetchEvent.emit(),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  ImpactType = ImpactType;

  addFinancialImpactsFormGroup = addFinancialImpactsFormGroup;
  removeFinancialImpactsFormGroup = removeFinancialImpactsFormGroup;

  constructor() {
    this.form = financialImpactsFormArrayGroup();
  }

  ngOnChanges(): void {
    this.setImpactFormData();
  }

  get impacts(): FormArray<FinancialImpactForm> {
    return this.form?.get('impacts') as FormArray;
  }

  private setImpactFormData() {
    if (
      this.report().financialImpacts.length === 0 &&
      !this.report().isFinalReport
    )
      return;

    this.form?.controls.impacts.clear();
    this.report().financialImpacts.map((impact) => {
      const impactForm = financialImpactsFormGroup();
      if (this.report().isFinalReport) impactForm.controls.type.disable();
      impactForm.patchValue({
        ...impact,
      });

      const assumptions = this.setAssumptionData(impact);
      impactForm.controls.criticalAssumptions = assumptions;

      this.form?.controls.impacts.push(impactForm);
    });
  }

  setAssumptionData(
    financialImpact: FinancialImpactDto
  ): FormArray<CriticalAssumptionForm> {
    const assumptions = criticalAssumptionsFormArrayGroup();
    if (
      financialImpact.criticalAssumptions.length > 0 ||
      this.report().isFinalReport
    ) {
      assumptions.clear();
      financialImpact.criticalAssumptions.map((s) => {
        const assumptionForm = criticalAssumptionFormGroup();
        assumptionForm.patchValue(s);
        assumptions.push(assumptionForm);
      });
    }
    return assumptions;
  }

  save() {
    const impacts: FinancialImpactCreateDto[] =
      this.form.controls.impacts.controls.map(
        (s) =>
          ({
            ...s.value,
            criticalAssumptions: s.controls.criticalAssumptions.value,
          }) as FinancialImpactCreateDto
      ) ?? [];

    this.updateMutation.mutate({
      dtos: impacts,
      id: this.report().id,
    });
  }

  public getImpactsSum() {
    const sum = { risks: { min: 0, max: 0 }, chances: { min: 0, max: 0 } };

    this.impacts.controls.forEach((control) => {
      if (control.controls.type.value === ImpactType.RISK) {
        sum.risks.min += control.controls.financialImpactMin.value ?? 0;
        sum.risks.max += control.controls.financialImpactMax.value ?? 0;
      } else {
        sum.chances.min += control.controls.financialImpactMin.value ?? 0;
        sum.chances.max += control.controls.financialImpactMax.value ?? 0;
      }
    });
    return sum;
  }
}
