/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { toast } from 'ngx-sonner';
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Messages } from '../../../shared/constants/messages';
import { AuthenticationService } from '../../services/authentication/authentication.service';

export const RoleGuard: CanActivateFn = (route) => {
  const authService: AuthenticationService = inject(AuthenticationService);

  const ownCompanyParam = route.queryParamMap.get('own');
  if (ownCompanyParam === 'true') return true;

  const currentRole = authService.getCurrentUserRole();
  if (!currentRole) return false;

  const isValid = route.data['roles'].includes(currentRole);
  if (!isValid) {
    toast(Messages.errorForbidden);
    return false;
  }
  return true;
};
