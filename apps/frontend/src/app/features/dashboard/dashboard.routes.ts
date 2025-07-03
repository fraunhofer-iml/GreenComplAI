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

export const dashboardRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./overview/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
];
