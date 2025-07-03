/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule } from '@ap2/database';
import { Module } from '@nestjs/common';
import { FlagsModule } from '../flags/flags.module';
import { PackagingModule } from '../packaging/packaging.module';
import { PackagingService } from '../packaging/packaging.service';
import { ProductGroupModule } from '../product-groups/product-group.module';
import { ProductAnalysisService } from '../products/analysis.service';
import { ProductsModule } from '../products/products.module';
import { WasteModule } from '../waste/waste.module';
import { AnalysisController } from './analysis.controller';
import { InFlowAnalysisService } from './in-flow-analysis.service';
import { WasteFlowAnalysisService } from './waste-flow-analysis.service';

@Module({
  imports: [
    ProductsModule,
    ProductGroupModule,
    PackagingModule,
    ConfigurationModule,
    DatabaseModule,
    WasteModule,
    FlagsModule,
  ],
  controllers: [AnalysisController],
  providers: [
    PackagingService,
    WasteFlowAnalysisService,
    InFlowAnalysisService,
    ProductAnalysisService,
  ],
})
export class AnalysisModule {}
