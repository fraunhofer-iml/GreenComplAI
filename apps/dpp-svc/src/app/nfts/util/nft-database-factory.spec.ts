/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NftMock, TokenReadDtoMock } from '@ap2/blockchain-connector';
import { ConfigurationModule } from '@ap2/configuration';
import { DatabaseModule, PrismaService } from '@ap2/database';
import { Test, TestingModule } from '@nestjs/testing';
import { NftDatabaseFactory } from './nft-database-factory';

describe('NftDatabaseFactory', () => {
  let service: NftDatabaseFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, ConfigurationModule],
      providers: [
        NftDatabaseFactory,
        {
          provide: PrismaService,
          useValue: {
            nft: {
              create: jest.fn().mockImplementation(() => NftMock),
              findFirst: jest.fn().mockImplementation(() => NftMock),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NftDatabaseFactory>(NftDatabaseFactory) as NftDatabaseFactory;
  });

  it('mintNFT: should create a new nft', async () => {
    const retVal = await service.mintNFT("testId", 'testDPP', 'testUrl');
    expect(retVal).toEqual(TokenReadDtoMock);
  });

  it('readNFTForInvoiceNumber: should read nft for dpp id', async () => {
    const retVal = await service.readNFT('testId');
    expect(retVal).toEqual(TokenReadDtoMock);
  });
});
