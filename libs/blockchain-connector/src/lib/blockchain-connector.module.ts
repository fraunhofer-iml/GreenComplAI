/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DataIntegrityModule,
  TokenModule,
} from 'nft-folder-blockchain-connector-besu';
import { Module } from '@nestjs/common';
import { BlockchainConnectorService } from './blockchain-connector.service';

@Module({
  imports: [DataIntegrityModule, TokenModule],
  providers: [BlockchainConnectorService],
  exports: [BlockchainConnectorService, DataIntegrityModule],
})
export class BlockchainConnectorModule {}
