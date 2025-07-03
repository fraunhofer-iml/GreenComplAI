/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PackagingMessagePatterns {
  CREATE = '/packaging/create',
  READ_BY_ID = '/packaging/read-by-id',
  PRELIMINARY = '/packaging/part-packagings',
  READ = '/packaging/read',
  DELETE = '/packaging/delete',
  UPDATE = '/packaging/update',
  UPDATE_WASTE = '/packaging/update/waste',
  UPDATE_PART_PACKAGING = '/packaging/update/part-packaging',
}
