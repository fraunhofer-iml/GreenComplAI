/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { OverviewComponent } from '../../../shared/components/overview/overview.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';

@Component({
  selector: 'app-company-overview',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    OverviewComponent,
  ],
  providers: [{ provide: DataService, useClass: CompaniesService }],
  templateUrl: './overview.component.html',
})
export class CompanyOverviewComponent {
  ContentType = ContentType;
  AuthRoles = AuthRoles;
  role = '';

  constructor(private readonly authService: AuthenticationService) {
    this.role = this.authService.getCurrentUserRole();
  }
}
