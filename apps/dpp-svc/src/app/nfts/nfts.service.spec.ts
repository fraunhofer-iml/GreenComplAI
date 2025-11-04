/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NftsService } from './nfts.service';

describe('NftsService', () => {
  let service: NftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NftsService],
    }).compile();

    service = module.get<NftsService>(NftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
