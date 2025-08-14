/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportDto } from '@ap2/api-interfaces';
import { Component, inject, input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../core/services/reports/reports.service';
import { ONLY_YEAR_FORMAT } from '../../../shared/constants/date-formats';
import { FinancialImpactComponent } from './financial-impacts/overview/financial-impact.component';
import { GoalInformationComponent } from './goal-informations/goal-information.component';
import { MeasuresComponent } from './measures/measures.component';
import { ReportInformationComponent } from './report-information/report-information.component';
import { StrategiesComponent } from './strategies/strategies.component';

@Component({
  selector: 'app-reports-overview',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    StrategiesComponent,
    MatChipsModule,
    MeasuresComponent,
    MatTabsModule,
    ReportInformationComponent,
    FinancialImpactComponent,
    GoalInformationComponent,
  ],
  providers: [
    ReportsService,
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: ONLY_YEAR_FORMAT },
  ],
  templateUrl: './details.component.html',
})
export class ReportsDetailsComponent {
  id = input<string>();

  private reportsService = inject(ReportsService);

  validationRequired = false;
  isValid = false;

  reportsQuery = injectQuery(() => ({
    queryKey: ['reports', this.id()],
    queryFn: async (): Promise<ReportDto> =>
      this.reportsService.getById(this.id() ?? ''),
    enabled: !!this.id(),
  }));
}
