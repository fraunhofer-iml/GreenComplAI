/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenReadDto } from 'nft-folder-blockchain-connector-besu';

export abstract class NftFactory {
  abstract mintNFT(
    dppId: string,
    dpp: any,
    dppURL: string
  ): Promise<TokenReadDto>;
  abstract readNFT(dppId: string): Promise<TokenReadDto | null>;
}
