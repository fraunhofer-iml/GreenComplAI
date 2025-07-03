/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MeasureCreateDto,
  MeasureStatus,
  ReportDto,
} from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { Component, inject, input, OnChanges, output } from '@angular/core';
import {
  FormArray,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../core/services/reports/reports.service';
import { MONTH_AND_YEAR_FORMAT } from '../../../../shared/constants/date-formats';
import { MeasureForm } from './measure.form';
import {
  addMeasureFormGroup,
  measureFormGroup,
  measuresFormArrayGroup,
  removeMeasureGroup,
} from './measures.form-group';

@Component({
  selector: 'app-measures',
  imports: [
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatButtonModule,
    FormsModule,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_AND_YEAR_FORMAT },
  ],
  templateUrl: './measures.component.html',
})
export class MeasuresComponent implements OnChanges {
  form: FormGroup<{
    measures: FormArray<MeasureForm>;
  }>;
  report = input.required<ReportDto>();
  refetchEvent = output<void>();

  reportsService = inject(ReportsService);

  selectedTabIndex = 0;

  get measures(): FormArray<MeasureForm> {
    return this.form?.get('measures') as FormArray;
  }

  MeasureStatus = MeasureStatus;

  constructor() {
    this.form = measuresFormArrayGroup();
  }

  ngOnChanges(): void {
    this.setData();
  }

  dateHandler(event: Date, picker: MatDatepicker<Date>, index: number) {
    picker.close();

    this.measures.controls[index].get('plannedCompletion')?.patchValue(event);
  }

  updateMutation = injectMutation(() => ({
    mutationFn: (props: { dtos: MeasureCreateDto[]; id: string }) =>
      this.reportsService.updateMeasures(props.dtos, props.id),
    onSuccess: () => this.refetchEvent.emit(),
    onError: () => toast('Speichern fehlgeschlagen'),
  }));

  save() {
    let measures: MeasureCreateDto[] =
      this.form.value.measures?.map((s) => s as MeasureCreateDto) ?? [];
    measures = measures.filter((s) => s.title);

    this.updateMutation.mutate({
      dtos: measures,
      id: this.report().id,
    });
  }

  addTab() {
    addMeasureFormGroup(this.form);
    this.moveToLatestTab();
  }

  removeTab(index: number) {
    removeMeasureGroup(this.form, index);
    this.moveToLatestTab();
  }

  private moveToLatestTab() {
    this.selectedTabIndex = this.form.controls.measures.controls.length - 1;
  }

  setData() {
    if (this.report().measures.length === 0 && !this.report().isFinalReport)
      return;
    this.form?.controls.measures.clear();
    this.report().measures.map((m) => {
      const form = measureFormGroup();
      if (this.report().isFinalReport) form.controls.status.disable();
      form.patchValue({ ...m, strategies: m.strategies.map((s) => s.id) });
      this.form?.controls.measures.push(form);
    });
  }

  isSelected(index: number, strategyId: string) {
    return this.measures.controls[index].controls.strategies.value.some(
      (s) => s === strategyId
    );
  }
}
