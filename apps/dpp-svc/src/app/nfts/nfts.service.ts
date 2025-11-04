/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import util from 'node:util';
import { TokenReadDto } from 'nft-folder-blockchain-connector-besu';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NftFactory } from './util/nft-factory';

@Injectable()
export class NftsService {
  private readonly logger = new Logger(NftsService.name);

  constructor(
    @Inject('NftFactory')
    private readonly nftFactory: NftFactory){
  }

  public async createNft(dppId: string, dpp: any, dppURL: string): Promise<TokenReadDto> {
    try {
      return this.nftFactory.mintNFT(dppId, dpp, dppURL);
    } catch (e) {
      this.logger.error(util.inspect(e));
      return null;
    }
  }

  public async getNft(dppId: string): Promise<TokenReadDto> {
    return this.nftFactory.readNFT(dppId);
  }
}
