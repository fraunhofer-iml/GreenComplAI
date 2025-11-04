/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetAdministrationShell, Submodel } from '@aas-core-works/aas-core3.0-typescript/types';
import { AuthRoles, getRealmRole } from '@ap2/api-interfaces';
import { Public, Roles } from 'nest-keycloak-connect';
import { TokenReadDto } from 'nft-folder-blockchain-connector-besu';
import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DppService } from './dpp.service';

@ApiTags('DPP')
@Controller('dpp')
export class DppController {
  private readonly logger: Logger = new Logger(DppController.name);

  constructor(private readonly dppService: DppService) {}

  @Post()
  @ApiOperation({
    description: 'Create DPP for a product.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'The ID of the product to create DPP for',
        },
      },
      required: ['productId'],
    },
  })
  @ApiBearerAuth()
  @Roles(getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER))
  @ApiOkResponse({
    description: 'Successfully created DPP',
  })
  createDpp(@Body() body: { productId: string }): Promise<void> {
    return this.dppService.createDpp(body.productId);
  }

  @Get(':aasIdentifier')
  @Public()
  @ApiOperation({
    description: 'Get DPP for a product.',
  })
  @ApiOkResponse({
    description: 'Successfully got DPP',
  })
  getDpp(
    @Param('aasIdentifier') aasIdentifier: string
  ): Promise<AssetAdministrationShell & { connectedSubmodels: Submodel[] }> {
    return this.dppService.getDpp(aasIdentifier);
  }

  @Get('nft/:dppId')
  @Public()
  @ApiOperation({
    description: 'Get NFT for DPP.',
  })
  @ApiOkResponse({
    description: 'Successfully got NFT',
  })
  getDppNft(
    @Param('dppId') dppId: string
  ): Promise<TokenReadDto> {
    console.log("Fine NFT for remoteId: ", dppId);
    return this.dppService.getDppNft(dppId).then(foundToken => {
      if (!foundToken) {
        throw new NotFoundException('Nft not found');
      }
      return foundToken;
    });
  }
}
