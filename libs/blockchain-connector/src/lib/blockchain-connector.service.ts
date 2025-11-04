/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DataIntegrityService,
  TokenAssetDto,
  TokenMetadataDto,
  TokenMintService,
  TokenReadDto,
  TokenReadService,
} from 'nft-folder-blockchain-connector-besu';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BlockchainConnectorService {

  private logger = new Logger(BlockchainConnectorService.name);

  constructor(
    private readonly dataIntegrityService: DataIntegrityService,
    private readonly tokenMintService: TokenMintService,
    private readonly tokenReadService: TokenReadService
  ) {}

  /**
   * Creates a new NFT from the information in a DPP.
   * @param dppId The ID of the DPP.
   * @param dpp The dpp data as a JSON string representation.
   * @param dppURL The URL where the dpp can be found.
   */
  public async mintNFT(
    dppId: string,
    dpp: any,
    dppURL: string
  ): Promise<TokenReadDto> {
    const dppHash: string = this.dataIntegrityService.hashData(
      Buffer.from(JSON.stringify(dpp))
    );

    return this.tokenMintService.mintToken(
      {
        remoteId: dppId,
        asset: new TokenAssetDto(dppURL, dppHash),
        metadata: new TokenMetadataDto('', ''),
        additionalData: '',
        parentIds: [],
      },
      false
    );
  }

  /**
   * Returns the NFT with the specified product id.
   * @param dppId The dpp id of the NFT to be returned.
   */
  public async readNFT(dppId: string): Promise<TokenReadDto | null> {
    try {
      const foundTokens = await this.tokenReadService.getTokens(dppId);
      if(foundTokens.length < 1) {
        return null;
      }
      return foundTokens[0];
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
