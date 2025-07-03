/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';

export interface TreeNode {
  name: string;
  roles: AuthRoles[];
  icon: string;
  routerLink?: string;
  children?: TreeNode[];
}
