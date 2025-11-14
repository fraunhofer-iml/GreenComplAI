/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@ap2/database';

@Injectable()
export class DppCompletenessService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
}
