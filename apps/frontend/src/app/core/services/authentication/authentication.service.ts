/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { KeycloakEventTypeLegacy, KeycloakService } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class AuthenticationService {
  private readonly keycloak = inject(KeycloakService);

  constructor() {
    this.getRoleFromKeycloak();
    this.keycloak.keycloakEvents$.subscribe({
      next: (event) => {
        if (event.type === KeycloakEventTypeLegacy.OnTokenExpired) {
          this.keycloak
            .updateToken(10)
            .catch(() => console.error('Failed to refresh token.'));
        }
      },
    });
    this.getRoleFromKeycloak();
  }

  logout(): void {
    localStorage.clear();
    this.keycloak.logout();
  }

  public getCurrentUserRole(): string {
    let role = localStorage.getItem('role');
    if (!role || role === '') {
      role = this.getRoleFromKeycloak();
    }
    return role ?? '';
  }

  public isSupplier(): boolean {
    if (!this.keycloak.isLoggedIn()) {
      return false;
    }
    return this.getCurrentUserRole() === AuthRoles.SUPPLIER;
  }

  async getCurrentUserName(): Promise<{
    firstName: string;
    lastName: string;
  }> {
    const profile: Keycloak.KeycloakProfile =
      await this.keycloak.loadUserProfile();
    return {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
    };
  }

  private getRoleFromKeycloak(): string {
    const role = this.keycloak
      .getUserRoles()
      .find((role) => role.substring(0, 4) === 'ap2_');
    localStorage.setItem('role', role ?? '');
    return role ?? '';
  }
}
