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
  ISubmodelElement,
  LangStringNameType,
  Submodel,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { FileDto, MaterialDto, ProductDto } from '@ap2/api-interfaces';
import { ConfigurationService } from '@ap2/configuration';
import {
  AasRepositoryClient,
  Configuration,
  SubmodelRepositoryClient,
} from 'basyx-typescript-sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  CircularPropertiesSubmodule,
  ESRSynergiesSubmodule,
  LegalComplianceSubmodule,
  MaterialCompositionSubmodule,
  PackagingSubmodule,
  ProductImportService,
} from './submodules';
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
  privateProductImportService: ProductImportService;

  constructor(private readonly configurationService: ConfigurationService) {
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

    this.privateProductImportService = new ProductImportService();
  }

  async getDpp(
    aasIdentifier: string
  ): Promise<AssetAdministrationShell & { connectedSubmodels: Submodel[] }> {
    const result = await this.client.getAssetAdministrationShellById({
      configuration: this.configuration,
      aasIdentifier: aasIdentifier,
    });
    if (!result.success) {
      this.logger.debug(result);
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
    return result.data;
  }

  async getProductFromDpp(id: string): Promise<ProductDto> {
    const dpp = await this.getDpp(id);

    const submodelMap = new Map<string, ISubmodelElement[]>();
    dpp.connectedSubmodels.forEach((e) =>
      submodelMap.set(e.idShort, e.submodelElements)
    );

    let product = { id: id } as ProductDto;

    const productIdentificationSubmodel: Partial<ProductDto> =
      this.privateProductImportService.setIdentificationDetails(
        submodelMap.get('product_identification')
      );

    const legalComplianceSubmodel: LegalComplianceSubmodule =
      this.privateProductImportService.getLegalComplianceSubmodel(
        submodelMap.get('legal_compliance')
      );

    const circiularProperties: CircularPropertiesSubmodule =
      this.privateProductImportService.getCircularProperties(
        submodelMap.get('circular_properties')
      );

    const ESRSynergies: ESRSynergiesSubmodule =
      this.privateProductImportService.getESRSynergiesSubmodel(
        submodelMap.get('esr_synergies')
      );

    const packagingSubmodel: PackagingSubmodule =
      this.privateProductImportService.getPackagingSubmodule(
        submodelMap.get('packaging')
      );

    console.log(packagingSubmodel);

    const materials: [MaterialDto, number, boolean?, boolean?][] =
      this.privateProductImportService.getMaterialCompositionSubmodel(
        submodelMap.get('material_composition')
      );

    const usagePhase = this.privateProductImportService.getUsagPhaseSubmodel(
      submodelMap.get('usage_phase')
    );

    product.supplier = {
      id: null,
      ...productIdentificationSubmodel.supplier,
      flags: [],
    };

    product = {
      id: id,
      productId: productIdentificationSubmodel.productId,
      supplier: {
        id: null,
        ...productIdentificationSubmodel.supplier,
        flags: [],
      },
      criticalRawMaterials: circiularProperties.concerningSubstances.map(
        (substance) => [{ name: substance }, 0]
      ),
      reparability: circiularProperties.repairabilityScore,
      productCarbonFootprint: ESRSynergies.productCarbonFootprint,
      waterUsed: ESRSynergies.waterFootprint,
      packagings: packagingSubmodel.packagingMaterials.map((packaging) => [
        { name: packaging.name, weight: packaging.weight },
        1,
      ]),
      materials: materials,
    } as ProductDto;

    this.logger.debug(product);

    return product;
  }
}
