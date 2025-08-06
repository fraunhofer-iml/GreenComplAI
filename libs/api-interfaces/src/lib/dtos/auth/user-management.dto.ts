/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserCreationData {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  initialPassword?: string;
  roles?: string[];
  groups?: string[];
  companyId?: string;
}

export interface UserAccountCreatedResult {
  id: string;
  username: string;
  email: string;
}
