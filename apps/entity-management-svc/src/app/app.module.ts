/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { AnalysisModule } from './analysis/analysis.module';
import { CompaniesModule } from './companies/companies.module';
import { IdocModule } from './idoc/idoc.module';
import { MappingModule } from './mapping/mapping.module';
import { PackagingModule } from './packaging/packaging.module';
import { ProductGroupModule } from './product-groups/product-group.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    CompaniesModule,
    ProductsModule,
    PackagingModule,
    AnalysisModule,
    ProductGroupModule,
    ReportsModule,
    MappingModule,
    IdocModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
