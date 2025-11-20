/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Route } from '@angular/router';

export const dppRoutes: Route[] = [
  {
    path: 'data-import',
    loadComponent: () =>
      import('./import/dpp-data-import.component').then(
        (m) => m.DppDataImportComponent
      ),
  },
  {
    path: ':aasIdentifier/data-import',
    loadComponent: () =>
      import('./import/dpp-data-import.component').then(
        (m) => m.DppDataImportComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./overview/dpp-overview.component').then(
        (m) => m.DppOverviewComponent
      ),
  },
];
