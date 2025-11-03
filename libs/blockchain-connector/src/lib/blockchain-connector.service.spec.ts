/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataIntegrityService, TokenMintService, TokenReadService } from 'nft-folder-blockchain-connector-besu';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainConnectorService } from './blockchain-connector.service';
import { TokenReadDtoMock } from './token-read-dto.mock';

describe('BlockchainConnectorService', () => {
  let service: BlockchainConnectorService;
  let mockedDataIntegrityService: Partial<DataIntegrityService>;
  let mockedTokenMintService: Partial<TokenMintService>;
  let mockedTokenReadService: Partial<TokenReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DataIntegrityService,
          useValue: {
            hashData: jest.fn()
          }
        },
        {
          provide: TokenMintService,
          useValue: {
            mintToken: jest.fn()
          }
        },
        {
          provide: TokenReadService,
          useValue: {
            getToken: jest.fn()
          }
        },
        BlockchainConnectorService,
      ],
    }).compile();
    mockedDataIntegrityService = module.get<DataIntegrityService>(DataIntegrityService);
    mockedTokenMintService = module.get<TokenMintService>(TokenMintService);
    mockedTokenReadService = module.get<TokenReadService>(TokenReadService);
    service = module.get<BlockchainConnectorService>(BlockchainConnectorService);
  });

  it('mintNFT: should create a new NFT', async () => {
    const integrityServiceSpy = jest.spyOn(
      mockedDataIntegrityService,
      'hashData'
    );
    integrityServiceSpy.mockImplementation(() => {
      return 'test_hash_string';
    });
    const mintServiceSpy = jest.spyOn(mockedTokenMintService, 'mintToken');
    mintServiceSpy.mockImplementation(() => {
      return Promise.resolve(TokenReadDtoMock);
    });
    expect(
      await service.mintNFT('testId', '{"test": "test value"}', 'testUrl')
    ).toEqual(TokenReadDtoMock);
  });

  it('readNFT: should read an existing NFT', async () => {
    const tokenReadServiceSpy = jest.spyOn(mockedTokenReadService, 'getTokens');
    tokenReadServiceSpy.mockImplementation(() => {
      return Promise.resolve([TokenReadDtoMock]);
    });
    expect(await service.readNFT('testId')).toEqual(TokenReadDtoMock);
  });
});
