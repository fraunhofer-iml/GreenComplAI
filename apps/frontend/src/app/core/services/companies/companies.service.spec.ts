/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  let service: CompaniesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), CompaniesService],
    });
    service = TestBed.inject(CompaniesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
