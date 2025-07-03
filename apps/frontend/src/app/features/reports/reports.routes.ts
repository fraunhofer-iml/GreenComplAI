/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { Route } from '@angular/router';
import { AuthenticationGuard } from '../../core/guards/auth-guard/authentication.guard';
import { RoleGuard } from '../../core/guards/role-guard/role.guard';

export const reportsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./overview/reports.component').then((m) => m.ReportsComponent),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER] },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./details/details.component').then(
        (m) => m.ReportsDetailsComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./details/details.component').then(
        (m) => m.ReportsDetailsComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER] },
  },
];
