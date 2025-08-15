/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule } from '@ap2/database';
import {
  STORAGE_SERVICE_TOKEN,
  StorageMinioService,
  StorageModule,
} from '@greencomplai/storage';
import { Module } from '@nestjs/common';
import { FlagsModule } from '../flags/flags.module';
import { WasteModule } from '../waste/waste.module';
import { ProductAnalysisService } from './analysis.service';
import { ProductCrudService } from './product-crud.service';
import { ProductFileService } from './product-file.service';
import { ProductOutlierService } from './product-outlier.service';
import { ProductRelationsService } from './product-relations.service';
import { ProductSupplierService } from './product-supplier.service';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    WasteModule,
    FlagsModule,
    StorageModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductCrudService,
    ProductAnalysisService,
    ProductRelationsService,
    ProductOutlierService,
    ProductSupplierService,
    ProductService,
    { provide: STORAGE_SERVICE_TOKEN, useClass: StorageMinioService },
    ProductFileService,
  ],
  exports: [ProductService],
})
export class ProductsModule {}
