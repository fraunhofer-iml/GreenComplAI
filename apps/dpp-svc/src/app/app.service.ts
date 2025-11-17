/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  AssetInformation,
  AssetKind,
  LangStringNameType,
  Submodel,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { FileDto, ProductDto } from '@ap2/api-interfaces';
import { ConfigurationService } from '@ap2/configuration';
import {
  AasRepositoryClient,
  Configuration,
  SubmodelRepositoryClient,
} from 'basyx-typescript-sdk';
import { TokenReadDto } from 'nft-folder-blockchain-connector-besu';
import { Injectable, Logger } from '@nestjs/common';
import { NftsService } from './nfts/nfts.service';
import { AasSubmoduleService } from './submodules/aas-submodule.service';
import { SubmoduleCreationService } from './submodules/submodule-creation.service';

@Injectable()
export class AppService {
  private readonly logger: Logger = new Logger(AppService.name);
  private client: AasRepositoryClient;
  private submodelRepositoryClient: SubmodelRepositoryClient;
  private configuration: Configuration;
  private submoduleCreationService: SubmoduleCreationService;
  private aasSubmoduleService: AasSubmoduleService;

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly nftService: NftsService
  ) {
    this.client = new AasRepositoryClient();
    this.submodelRepositoryClient = new SubmodelRepositoryClient();
    this.configuration = new Configuration({
      basePath: this.configurationService.getBasyxConfig().baseUrl,
    });
    this.submoduleCreationService = new SubmoduleCreationService();
    this.aasSubmoduleService = new AasSubmoduleService(
      this.client,
      this.configuration,
      this.submodelRepositoryClient
    );
  }

  async getDPPNft(dppId: string): Promise<TokenReadDto> {
    return this.nftService.getNft(dppId);
  }

  async getDpp(
    aasIdentifier: string
  ): Promise<AssetAdministrationShell & { connectedSubmodels: Submodel[] }> {
    const result = await this.client.getAssetAdministrationShellById({
      configuration: this.configuration,
      aasIdentifier: aasIdentifier,
    });
    if (!result.success) {
      throw new Error('Failed to get DPP');
    }

    const connectedSubmodels: Submodel[] = [];

    if (result.data.submodels.length > 0) {
      for (const submodel of result.data.submodels) {
        const sub = await this.submodelRepositoryClient.getSubmodelById({
          configuration: this.configuration,
          submodelIdentifier: submodel.keys[0].value,
        });
        if (!sub.success) {
          this.logger.error('Failed to get submodel');
          continue;
        }
        connectedSubmodels.push(sub.data);
      }
    }

    return Object.assign(result.data, {
      connectedSubmodels: connectedSubmodels,
    });
  }

  async createDpp(
    product: ProductDto,
    uploadedFiles: FileDto[]
  ): Promise<AssetAdministrationShell> {
    const assetInformation = new AssetInformation(
      AssetKind.Instance,
      product.id
    );
    const assetAdministrationShell = new AssetAdministrationShell(
      product.id,
      assetInformation,
      [],
      'product',
      product.productId,
      [new LangStringNameType('de', product.name)]
    );
    assetAdministrationShell.submodels = [];

    const result = await this.client.postAssetAdministrationShell({
      configuration: this.configuration,
      assetAdministrationShell,
    });

    if (!result.success) {
      throw new Error('Failed to create Asset Administration Shell');
    }

    const submodules = this.submoduleCreationService.createSubmodules(
      product,
      uploadedFiles
    );

    try {
      await this.aasSubmoduleService.createAndAttachSubmodules(
        assetAdministrationShell,
        submodules
      );
    } catch (error) {
      this.logger.error('Error attaching submodules to AAS:', error);
    }

    if (!result.success) {
      throw new Error('Failed to create DPP');
    }

    try {
      const createdDppData = await this.getDpp(assetAdministrationShell.id);
      const dppUrl = `${process.env['BCC_DPP_TOKEN_BASE_URL']}/${assetAdministrationShell.id}`;
      await this.nftService.createNft(product.id, createdDppData, dppUrl);
    } catch (error) {
      this.logger.error('Failed to create NFT:', error);
    }
    return result.data;
  }
}
