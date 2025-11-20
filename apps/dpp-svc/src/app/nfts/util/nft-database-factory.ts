/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import util from 'node:util';
import { PrismaService } from '@ap2/database';
import {
  TokenAssetDto,
  TokenHierarchyDto,
  TokenMetadataDto,
  TokenReadDto,
} from 'nft-folder-blockchain-connector-besu';
import { Injectable, Logger } from '@nestjs/common';
import { NftFactory } from './nft-factory';
import {
  NFT_ADDRESS,
  NFT_MINTER_ADDRESS,
  NFT_OWNER_ADDRESS,
} from './nft.constants';

@Injectable()
export class NftDatabaseFactory extends NftFactory {
  private logger = new Logger(NftDatabaseFactory.name);

  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async mintNFT(
    dppId: string,
    dpp: any,
    dppURL: string
  ): Promise<TokenReadDto> {
    try {
      const dppHash: string = this.hashData(JSON.stringify(dpp));

      const createdNft = await this.prismaService.nft.create({
        data: {
          remoteId: dppId,
          ownerAddress: NFT_OWNER_ADDRESS,
          minterAddress: NFT_MINTER_ADDRESS,
          tokenAddress: NFT_ADDRESS,
          assetInvoiceUrl: dppURL,
          assetInvoiceHash: dppHash,
          metadataUrl: '',
          metadataHash: '',
          additionalData: '',
        },
      });
      return this.convertToDto(createdNft);
    } catch (e) {
      this.logger.error(util.inspect(e));
      throw e;
    }
  }

  public async readNFT(dppId: string): Promise<TokenReadDto | null> {
    try {
      const storedToken = await this.prismaService.nft.findFirst({
        where: { remoteId: dppId },
      });
      if (!storedToken) {
        return null;
      }
      return this.convertToDto(storedToken);
    } catch (e) {
      this.logger.error(util.inspect(e));
      return null;
    }
  }

  private hashData(hashInput: string): string {
    return createHash('sha256').update(hashInput).digest('hex');
  }

  private convertToDto(nft: any): TokenReadDto {
    return new TokenReadDto(
      nft.remoteId,
      new TokenAssetDto(nft.assetInvoiceUrl, nft.assetInvoiceHash),
      new TokenMetadataDto(nft.metadataUrl, nft.metadataHash),
      nft.additionalData,
      new TokenHierarchyDto(false, [], []),
      nft.ownerAddress,
      nft.minterAddress,
      nft.createdOn.toISOString(),
      nft.lastUpdatedOn.toISOString(),
      Number(nft.id),
      nft.tokenAddress
    );
  }
}
