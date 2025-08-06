/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule, PrismaService } from '@ap2/database';
import { Test, TestingModule } from '@nestjs/testing';
import { FlagsModule } from '../flags/flags.module';
import { WasteModule } from '../waste/waste.module';
import { ProductAnalysisService } from './analysis.service';
import { ProductCrudService } from './product-crud.service';
import { ProductOutlierService } from './product-outlier.service';
import { ProductRelationsService } from './product-relations.service';
import { ProductSupplierService } from './product-supplier.service';
import { ProductService } from './products.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule, DatabaseModule, WasteModule, FlagsModule],
      providers: [
        ProductCrudService,
        ProductAnalysisService,
        ProductRelationsService,
        ProductOutlierService,
        ProductSupplierService,
        ProductService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
