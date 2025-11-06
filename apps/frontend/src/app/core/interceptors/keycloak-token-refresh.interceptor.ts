/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeycloakService } from 'keycloak-angular';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const keycloakTokenRefreshInterceptor: HttpInterceptorFn = (
  req,
  next
) => {
  const keycloakService = inject(KeycloakService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && keycloakService.isLoggedIn()) {
        return from(keycloakService.updateToken(30)).pipe(
          switchMap(() => {
            const token = keycloakService.getKeycloakInstance().token;
            const clonedRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next(clonedRequest);
          }),
          catchError((refreshError) => {
            console.error('Failed to refresh token:', refreshError);
            keycloakService.logout();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
