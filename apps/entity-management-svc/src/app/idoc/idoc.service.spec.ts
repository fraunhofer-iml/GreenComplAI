/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule, PrismaService } from '@ap2/database';
import { UserManagementModule } from '@greencomplai/user-management';
import { Test, TestingModule } from '@nestjs/testing';
import { FlagsModule } from '../flags/flags.module';
import { IdocService } from './idoc.service';

describe('CompanyService', () => {
  let service: IdocService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigurationModule,
        DatabaseModule,
        FlagsModule,
        UserManagementModule,
      ],
      providers: [IdocService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<IdocService>(IdocService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
