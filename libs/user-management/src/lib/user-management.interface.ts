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

export interface IUserManagementService {
  createUser(userData: UserCreationData): Promise<UserAccountCreatedResult>;
  deleteUser(userId: string): Promise<void>;
}

export const USER_MANAGEMENT_SERVICE_TOKEN = 'IUserManagementService';
