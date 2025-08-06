/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Messages } from '../../../shared/constants/messages';
import { AuthenticationService } from '../../services/authentication/authentication.service';

export const RoleGuard: CanActivateFn = (route) => {
  const authService: AuthenticationService = inject(AuthenticationService);
  const router = inject(Router);

  const ownCompanyParam = route.queryParamMap.get('own');
  if (ownCompanyParam === 'true') return true;

  const currentRole = authService.getCurrentUserRole();
  if (!currentRole) return false;

  const isValid = route.data['roles'].includes(currentRole);
  console.log(
    `Current role: ${currentRole}, Valid roles: ${route.data['roles']}, Is valid: ${isValid}`
  );
  if (!isValid && currentRole === AuthRoles.SUPPLIER) {
    console.log('Redirecting supplier to products page');
    router.navigate(['/products'], { replaceUrl: true });
    return false;
  }
  if (!isValid) {
    toast(Messages.errorForbidden);
    return false;
  }
  return true;
};
