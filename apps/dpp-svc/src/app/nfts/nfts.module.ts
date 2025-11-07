/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockchainConnectorModule } from '@ap2/blockchain-connector';
import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule } from '@ap2/database';
import { Module } from '@nestjs/common';
import { NftsService } from './nfts.service';
import { NftBlockchainFactory } from './util/nft-blockchain-factory';
import { NftDatabaseFactory } from './util/nft-database-factory';

@Module({
  imports: [ConfigurationModule, DatabaseModule, BlockchainConnectorModule],
  providers: [
    NftsService,
    NftDatabaseFactory,
    NftBlockchainFactory,
    {
      provide: 'NftFactory',
      useClass:
        process.env['BCC_ENABLED'] == 'true'
          ? NftBlockchainFactory
          : NftDatabaseFactory,
    },
  ],
  exports: [NftsService],
})
export class NftsModule {}
