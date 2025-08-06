/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { Route } from '@angular/router';
import { AuthenticationGuard } from './core/guards/auth-guard/authentication.guard';
import { RoleGuard } from './core/guards/role-guard/role.guard';

export const appRoutes: Route[] = [
  {
    path: 'companies',
    loadChildren: () =>
      import('./features/companies/company.routes').then(
        (m) => m.companyRoutes
      ),
    canActivateChild: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER] },
  },
  {
    path: 'products',
    loadChildren: () =>
      import('./features/products/product.routes').then((m) => m.productRoutes),
    canActivateChild: [AuthenticationGuard, RoleGuard],
    data: {
      roles: [
        AuthRoles.SUSTAINABILITY_MANAGER,
        AuthRoles.BUYER,
        AuthRoles.SUPPLIER,
      ],
    },
  },
  {
    path: 'packaging',
    loadChildren: () =>
      import('./features/packaging/packaging.routes').then(
        (m) => m.packagingRoutes
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.BUYER, AuthRoles.SUSTAINABILITY_MANAGER] },
  },
  {
    path: 'product-groups',
    loadChildren: () =>
      import('./features/product-group/product-group.routes').then(
        (m) => m.productGroupRoutes
      ),
    canActivateChild: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.reportsRoutes),
    canActivateChild: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER] },
  },

  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/overview/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [AuthenticationGuard, RoleGuard],
    data: { roles: [AuthRoles.SUSTAINABILITY_MANAGER, AuthRoles.BUYER] },
  },
];
