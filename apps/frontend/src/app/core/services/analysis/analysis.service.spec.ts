/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(AnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
