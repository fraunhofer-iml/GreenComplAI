/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ISubmodelElement,
  ModelType,
  Property,
  SubmodelElementCollection,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { AddressDto, CompanyDto, ProductDto } from '@ap2/api-interfaces';
import { Injectable } from '@nestjs/common';
import {
  CIRCILAR_PROPERTIES_KEYS,
  CircularPropertiesSubmodule,
  ESR_SYNERGIES_KEYS,
  ESRSynergiesSubmodule,
  LEGAL_COMPIANCE_KEYS,
  LegalComplianceSubmodule,
  MaterialCompositionSubmodule,
  PackagingSubmodule,
  UsagePhaseSubmodule,
} from './submodule.types';

@Injectable()
export class ProductImportService {
  setIdentificationDetails(
    submodelElements: ISubmodelElement[]
  ): Partial<ProductDto> {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const supplier = this.submodelToCompany(submodelMap.get('supplier'));
    submodelMap.set('supplier', supplier);

    const importer = this.submodelToCompany(submodelMap.get('importer'));
    submodelMap.set('importer', importer);
    const submodelData: Partial<ProductDto> = {
      productId: submodelMap.get('uniqueProductIdentifier'),
      gtin: submodelMap.get('gtin'),
      taricCode: submodelMap.get('taricCode'),
      supplier: submodelMap.get('supplier'),
    };

    return submodelData;
  }

  getLegalComplianceSubmodel(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements ?? []);

    submodelMap.set('technicalDocumentation', {
      certificates: submodelMap
        .get('technicalDocumentation')
        .get('certificates'),
    });

    const submodel: LegalComplianceSubmodule = Object.fromEntries(
      [...submodelMap].filter(([key]) =>
        LEGAL_COMPIANCE_KEYS.includes(key as keyof LegalComplianceSubmodule)
      )
    ) as LegalComplianceSubmodule;

    return submodel;
  }

  getCircularProperties(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: CircularPropertiesSubmodule = Object.fromEntries(
      [...submodelMap].filter(([key]) =>
        CIRCILAR_PROPERTIES_KEYS.includes(
          key as keyof CircularPropertiesSubmodule
        )
      )
    ) as CircularPropertiesSubmodule;

    return submodel;
  }

  getESRSynergiesSubmodel(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: ESRSynergiesSubmodule = Object.fromEntries(
      [...submodelMap].filter(([key]) =>
        ESR_SYNERGIES_KEYS.includes(key as keyof ESRSynergiesSubmodule)
      )
    ) as CircularPropertiesSubmodule;

    return submodel;
  }

  getPackagingSubmodule(
    submodelElements: ISubmodelElement[]
  ): PackagingSubmodule {
    if (!submodelElements || submodelElements.length === 0)
      return {
        totalWeight: 0,
        packagingMaterials: [],
      } as PackagingSubmodule;

    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const materials = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = submodelMap.get(`packagingMaterial_${index - 1}`);
      materials.push(
        Object.fromEntries([...(element as Map<string, unknown>)])
      );
    }

    const submodel: PackagingSubmodule = {
      totalWeight: submodelMap.get('totalWeight'),
      packagingMaterials: materials,
    } as PackagingSubmodule;

    return submodel;
  }

  getMaterialCompositionSubmodel(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const materials = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = submodelMap.get(`material_${index - 1}`);
      materials.push(
        Object.fromEntries([...(element as Map<string, unknown>)])
      );
    }

    const submodel: MaterialCompositionSubmodule = {
      totalWeight: submodelMap.get('totalWeight'),
      materials: materials,
    } as MaterialCompositionSubmodule;

    return submodel;
  }

  getUsagPhaseSubmodel(
    submodelElements: ISubmodelElement[]
  ): UsagePhaseSubmodule {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    return {
      usageInstructions: submodelMap.get('usageInstructions'),
    } as UsagePhaseSubmodule;
  }

  private mapSubmodelsToMap(
    map: Map<string, unknown>,
    submodelElements: ISubmodelElement[]
  ) {
    (submodelElements ?? []).forEach((element) => {
      if (element.modelType() === ModelType.Property) {
        let value = (element as Property).value;
        value = this.parseStringValue(value);
        map.set(element.idShort, value);
      }
      if (element.modelType() === ModelType.SubmodelElementCollection) {
        const nestedMap = new Map<string, unknown>();
        this.mapSubmodelsToMap(
          nestedMap,
          (element as SubmodelElementCollection).value
        );
        map.set(element.idShort, nestedMap);
      }
    });
  }

  private submodelToCompany(map: Map<string, any>): CompanyDto {
    let address: AddressDto | undefined = undefined;
    const addressAsString = map.get('address');
    if (addressAsString) {
      const [street, cityInformation, country] = map.get('address').split(',');

      const [postcode, city] = cityInformation.trim().split(' ');
      address = {
        street: street,
        city: city,
        postalCode: postcode,
        country: country,
      };
    }

    const company = {
      name: map.get('name'),
      email: map.get('email'),
      phone: map.get('phone'),
      addresses: [address],
    } as CompanyDto;

    return company;
  }

  private parseStringValue(value: string) {
    if (typeof value === 'string' && value.startsWith('["'))
      return JSON.parse(value);
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }
}
