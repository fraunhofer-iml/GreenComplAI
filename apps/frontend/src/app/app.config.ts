/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeycloakBearerInterceptor, KeycloakService } from 'keycloak-angular';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { appRoutes } from './app.routes';
import { AuthenticationService } from './core/services/authentication/authentication.service';
import { CompaniesService } from './core/services/companies/companies.service';
import { PackagingService } from './core/services/packaging/packaging.service';
import { ProductsService } from './core/services/products/products.service';
import { ProductConstructionService } from './features/products/create/form-construction/product-construction.service';
import { initializeKeycloak } from './init/keycloak-initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideAppInitializer(() => {
      const initializerFn = initializeKeycloak(inject(KeycloakService));
      return initializerFn();
    }),
    KeycloakBearerInterceptor,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: KeycloakBearerInterceptor,
      multi: true,
      deps: [KeycloakService],
    },
    ProductConstructionService,
    CompaniesService,
    ProductsService,
    PackagingService,
    KeycloakService,
    AuthenticationService,
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    provideAngularQuery(new QueryClient()),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      },
    },
  ],
};
