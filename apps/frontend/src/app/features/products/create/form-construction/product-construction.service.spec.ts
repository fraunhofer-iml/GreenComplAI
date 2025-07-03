/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestBed } from '@angular/core/testing';
import { ProductConstructionService } from './product-construction.service';

describe('ProductConstructionService', () => {
  let service: ProductConstructionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductConstructionService],
    });
    service = TestBed.inject(ProductConstructionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
