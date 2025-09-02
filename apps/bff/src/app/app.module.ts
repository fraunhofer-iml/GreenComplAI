/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfigurationModule,
  KeycloakConfigurationService,
} from '@ap2/configuration';
import {
  AuthGuard,
  KeycloakConnectModule,
  RoleGuard,
} from 'nest-keycloak-connect';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AnalysisModule } from './analysis/analysis.module';
import { CompaniesModule } from './companies/companies.module';
import { ErrorsInterceptor } from './core/error-interceptor';
import { MappingModule } from './mappings/mappings.module';
import { PackagingModule } from './packaging/packaging.module';
import { ProductGroupModule } from './product-group/product-group.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './report/reports.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { IdocModule } from './idoc/idoc.module';

@Module({
  imports: [
    AnalysisModule,
    ConfigurationModule,
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigurationService,
      imports: [ConfigurationModule],
    }),
    ProductsModule,
    CompaniesModule,
    PackagingModule,
    ProductGroupModule,
    ReportsModule,
    MappingModule,
    SuppliersModule,
    IdocModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ErrorsInterceptor },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule {}
