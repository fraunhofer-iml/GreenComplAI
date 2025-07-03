/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ProductGroupService } from './product-group.service';

describe('ProductGroupService', () => {
  let service: ProductGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), ProductGroupService],
    });
    service = TestBed.inject(ProductGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
