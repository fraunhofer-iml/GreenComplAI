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
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NftsModule } from './nfts/nfts.module';

@Module({
  imports: [ConfigurationModule, DatabaseModule, NftsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
