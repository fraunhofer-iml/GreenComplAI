/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */


import { Component } from '@angular/core';
import { MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data-service/data.service';
import { ReportsService } from '../../../core/services/reports/reports.service';
import { OverviewComponent } from '../../../shared/components/overview/overview.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';

@Component({
  selector: 'app-reports-overview',
  imports: [MatAnchor, OverviewComponent, RouterLink],
  providers: [{ provide: DataService, useClass: ReportsService }],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  protected readonly ContentType = ContentType;
}
