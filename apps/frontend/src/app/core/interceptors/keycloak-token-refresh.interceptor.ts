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
      // Prüfe ob es ein 401 Unauthorized Fehler ist
      if (error.status === 401 && keycloakService.isLoggedIn()) {
        // Versuche den Token zu erneuern
        return from(keycloakService.updateToken(30)).pipe(
          switchMap(() => {
            // Token wurde erfolgreich erneuert, wiederhole die ursprüngliche Anfrage
            // Erstelle eine neue Anfrage mit dem aktualisierten Token
            const token = keycloakService.getKeycloakInstance().token;
            const clonedRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next(clonedRequest);
          }),
          catchError((refreshError) => {
            // Token-Erneuerung fehlgeschlagen, nutzer muss sich neu einloggen
            console.error('Failed to refresh token:', refreshError);
            keycloakService.logout();
            return throwError(() => error);
          })
        );
      }

      // Wenn es kein 401 Fehler ist oder der Nutzer nicht eingeloggt ist, weiterleiten
      return throwError(() => error);
    })
  );
};
