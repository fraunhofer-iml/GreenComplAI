/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenReadDto } from 'nft-folder-blockchain-connector-besu';
import { Injectable } from '@nestjs/common';
import { NftFactory } from './nft-factory';
import { BlockchainConnectorService } from '@ap2/blockchain-connector';

@Injectable()
export class NftBlockchainFactory extends NftFactory {

  constructor(private readonly blockchainConnectorService: BlockchainConnectorService) {
    super();
  }

  mintNFT(dppId: string, dpp: any, dppURL: string): Promise<TokenReadDto> {
    return this.blockchainConnectorService.mintNFT(dppId, dpp, dppURL);
  }
  readNFT(dppId: string): Promise<TokenReadDto> {
    return this.blockchainConnectorService.readNFT(dppId);
  }
}
