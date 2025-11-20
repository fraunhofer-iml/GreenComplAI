/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TokenAssetDto,
  TokenHierarchyDto,
  TokenMetadataDto,
  TokenReadDto,
} from 'nft-folder-blockchain-connector-besu';

export const TokenReadDtoMock: TokenReadDto = new TokenReadDto(
  'testId',
  new TokenAssetDto(
    '{"test": "test value"}',
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  ),
  new TokenMetadataDto('', ''),
  '',
  new TokenHierarchyDto(false, [], []),
  '0x72e37d393c70823113a7176aC1F7C579d2C5623E',
  '0x72e37d393c70823113a7176aC1F7C579d2C5623E',
  '2024-10-12T00:00:00.000Z',
  '2024-11-12T00:00:00.000Z',
  0,
  '0x2B2f78c5BF6D9C12Ee1225D5F374aa91204580c3'
);
