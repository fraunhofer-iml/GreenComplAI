/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserAccountCreatedResult,
  UserCreationData,
} from '@ap2/api-interfaces';
import { ConfigurationService } from '@ap2/configuration';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { Injectable, Logger } from '@nestjs/common';
import { IUserManagementService } from '../user-management.interface';

@Injectable()
export class KeycloakUserManagementAdapter implements IUserManagementService {
  private readonly logger = new Logger(KeycloakUserManagementAdapter.name);
  private kcAdminClient: KcAdminClient;

  constructor(private readonly configService: ConfigurationService) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.getKeycloakConfig().url,
      realmName: this.configService.getKeycloakConfig().realm,
    });

    this.kcAdminClient.auth({
      clientId: this.configService.getKeycloakConfig().clientId,
      grantType: 'client_credentials',
      clientSecret: this.configService.getKeycloakConfig().secret,
    });
  }

  async createUser(
    userData: UserCreationData
  ): Promise<UserAccountCreatedResult> {
    this.logger.debug(`Creating user with data: ${JSON.stringify(userData)}`);
    if (!this.kcAdminClient) {
      this.logger.error('Keycloak Admin Client is not initialized');
      throw new Error('Keycloak Admin Client is not initialized');
    }
    this.logger.debug(
      `Creating user in Keycloak with username: ${userData.username}, email: ${userData.email}`
    );

    try {
      const createdUser = await this.kcAdminClient.users.create({
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: userData.initialPassword || 'defaultPassword',
            temporary: false,
          },
        ],
        attributes: {
          company: userData.companyId || '',
        },
        groups: userData.groups || [],
        realmRoles: userData.roles || [],
      });

      return {
        id: createdUser.id,
        username: userData.username,
        email: userData.email,
      };
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.logger.debug(`Deleting user with ID: ${userId}`);
    if (!this.kcAdminClient) {
      this.logger.error('Keycloak Admin Client is not initialized');
      throw new Error('Keycloak Admin Client is not initialized');
    }
    try {
      await this.kcAdminClient.users.del({ id: userId });
      this.logger.debug(`User with ID ${userId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting user: ${error}`);
      throw new Error(`Failed to delete user: ${error}`);
    }
  }
}
