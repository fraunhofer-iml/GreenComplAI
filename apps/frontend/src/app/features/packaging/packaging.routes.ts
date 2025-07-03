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

export const packagingRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./overview/overview.component').then(
        (m) => m.PackagingOverviewComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.BUYER, AuthRoles.SUSTAINABILITY_MANAGER] },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create/create.component').then(
        (m) => m.PackagingCreateComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.BUYER] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./details/packaging-details.component').then(
        (m) => m.PackagingDetailsComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.BUYER] },
  },
  {
    path: ':id/waste',
    loadComponent: () =>
      import('./details/waste-update/waste-update.component').then(
        (m) => m.WasteUpdateComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.BUYER] },
  },
];
