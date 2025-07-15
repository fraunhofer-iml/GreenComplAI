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

export const productRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./overview/overview.component').then(
        (m) => m.ProductOverviewComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create/product-create.component').then(
        (m) => m.ProductCreateComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: 'outliers',
    loadComponent: () =>
      import('./overview/outliers/outlier-table.component').then(
        (m) => m.OutlierTableComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./details/details.component').then(
        (m) => m.ProductDetailsComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./details/master-data-update/product-update.component').then(
        (m) => m.ProductUpdateComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: ':id/waste',
    loadComponent: () =>
      import('./details/waste-update/product-waste-update.component').then(
        (m) => m.ProductWasteUpdateComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: ':id/analysis',
    loadComponent: () =>
      import('./analysis/analysis.component').then((m) => m.AnalysisComponent),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
];
