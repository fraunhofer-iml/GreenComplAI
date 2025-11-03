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
import { Injectable } from '@nestjs/common';

@Injectable()
export class BlockchainConnectorService {
  constructor(
    private readonly dataIntegrityService: DataIntegrityService,
    private readonly tokenMintService: TokenMintService,
    private readonly tokenReadService: TokenReadService
  ) {}

  /**
   * Creates a new NFT from the information in a DPP.
   * @param productId The ID of the product or the DPP.
   * @param dpp The dpp data as a JSON string representation.
   * @param dppURL The URL where the dpp can be found.
   */
  public async mintNFT(
    productId: string,
    dpp: any,
    dppURL: string
  ): Promise<TokenReadDto> {
    const dppHash: string = this.dataIntegrityService.hashData(Buffer.from(JSON.stringify(dpp)));

    return this.tokenMintService.mintToken(
      {
        remoteId: productId,
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
   * @param productId The product id of the NFT to be returned.
   */
  public async readNFT(productId: string): Promise<TokenReadDto> {
    return (await this.tokenReadService.getTokens(productId))[0];
  }
}
