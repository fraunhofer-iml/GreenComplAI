/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorMessages } from '@ap2/api-interfaces';
import { KeycloakService } from 'keycloak-angular';
import { toast } from 'ngx-sonner';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Messages } from '../../../shared/constants/messages';
import { Uris } from '../../../shared/constants/uris';
import { CompaniesService } from '../../services/companies/companies.service';

export const AuthenticationGuard: CanActivateFn = async (route) => {
  const keycloakService: KeycloakService = inject(KeycloakService);

  const companiesService: CompaniesService = inject(CompaniesService);
  const router: Router = inject(Router);
  const isLoggedIn = keycloakService.isLoggedIn();

  if (!isLoggedIn) return false;

  const ownCompanyParam = route.queryParamMap.get('own');
  if (ownCompanyParam === 'true') return true;

  try {
    await companiesService.findOwnCompany();
  } catch (error) {
    if (
      error instanceof HttpErrorResponse &&
      error.error.message === ErrorMessages.userHasNoCompany
    ) {
      router.navigate([Uris.createCompany], {
        queryParams: { own: true },
      });
      toast(Messages.errorCompany);

      return false;
    }
  }
  return true;
};
