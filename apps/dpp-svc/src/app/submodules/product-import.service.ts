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
import {
  AddressDto,
  CompanyDto,
  CRITICAL_RAW_MATERIALS,
  CriticalRawMaterials,
  MaterialDto,
  PackagingDto,
  ProductDto,
} from '@ap2/api-interfaces';
import { Injectable } from '@nestjs/common';
import {
  CIRCILAR_PROPERTIES_KEYS,
  CircularPropertiesSubmodule,
  ESR_SYNERGIES_KEYS,
  ESRSynergiesSubmodule,
  LEGAL_COMPIANCE_KEYS,
  LegalComplianceSubmodule,
  UsagePhaseSubmodule,
} from './submodule.types';

@Injectable()
export class ProductImportService {
  setIdentificationDetails(
    submodelElements: ISubmodelElement[]
  ): Partial<ProductDto> {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);
    const supplier = this.submodelToCompany(submodelMap.get('supplier')?.value);
    const importer = this.submodelToCompany(submodelMap.get('importer')?.value);

    const submodelData: Partial<ProductDto> = {
      productId: submodelMap.get('uniqueProductIdentifier').value,
      gtin: submodelMap.get('gtin')?.value,
      taricCode: submodelMap.get('taricCode')?.value,
      supplier: supplier,
      importerName: importer?.name,
      importerAddress: importer
        ? `${importer.addresses[0]?.street}, ${importer.addresses[0]?.postalCode} ${importer.addresses[0]?.city}, ${importer.addresses[0]?.country}`
        : null,
      importerEmail: importer?.email,
      importerPhone: importer?.phone,
    };

    return submodelData;
  }

  getLegalComplianceSubmodel(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements ?? []);

    submodelMap.set('technicalDocumentation', {
      certificates: submodelMap
        .get('technicalDocumentation')
        .value?.get('certificates').value,
    });

    const submodel: LegalComplianceSubmodule = Object.fromEntries(
      [...submodelMap].filter(([key]) =>
        LEGAL_COMPIANCE_KEYS.includes(key as keyof LegalComplianceSubmodule)
      )
    ) as LegalComplianceSubmodule;

    console.log('getLegalComplianceSubmodel');
    return submodel;
  }

  getCircularProperties(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: CircularPropertiesSubmodule = Object.fromEntries(
      [...submodelMap]
        .filter(([key]) =>
          CIRCILAR_PROPERTIES_KEYS.includes(
            key as keyof CircularPropertiesSubmodule
          )
        )
        .map((e) => [e[0], e[1].value])
    ) as CircularPropertiesSubmodule;

    return submodel;
  }

  getESRSynergiesSubmodel(submodelElements: ISubmodelElement[]) {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: ESRSynergiesSubmodule = Object.fromEntries(
      [...submodelMap]
        .filter(([key]) =>
          ESR_SYNERGIES_KEYS.includes(key as keyof ESRSynergiesSubmodule)
        )
        .map((e) => [e[0], e[1].value])
    ) as CircularPropertiesSubmodule;

    return submodel;
  }

  getPackagingSubmodule(submodelElements: ISubmodelElement[]): PackagingDto[] {
    if (!submodelElements || submodelElements.length === 0) return [];

    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const materials: PackagingDto[] = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = submodelMap.get(`packagingMaterial_${index - 1}`);

      const packaging: PackagingDto = {
        name: element.value.get('name'),
        weight: element.value.get('weight'),
      } as PackagingDto;

      console.log(element);

      materials.push(element);
    }

    return materials;
  }

  getMaterialCompositionSubmodel(submodelElements: ISubmodelElement[]): {
    criticalRawMaterials: [MaterialDto, number][];
    materials: [MaterialDto, number, boolean?, boolean?][];
  } {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const items: [MaterialDto, number, boolean?, boolean?][] = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = this.submodelToMaterial(
        submodelMap.get(`material_${index - 1}`)
      );

      items.push(element);
    }

    const materials: [MaterialDto, number, boolean?, boolean?][] = [];

    const criticalRawMaterials: [MaterialDto, number][] = [];
    items.forEach((m) =>
      CRITICAL_RAW_MATERIALS.includes(m[0].name as CriticalRawMaterials)
        ? criticalRawMaterials.push([m[0], m[1]])
        : materials.push(m)
    );

    return { criticalRawMaterials, materials };
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
        map.set(element.idShort, {
          name: element.displayName[0].text,
          value: value,
        });
      }
      if (element.modelType() === ModelType.SubmodelElementCollection) {
        const nestedMap = new Map<string, unknown>();
        this.mapSubmodelsToMap(
          nestedMap,
          (element as SubmodelElementCollection).value
        );
        map.set(element.idShort, {
          name: element.displayName[0].text,
          value: nestedMap,
        });
      }
    });
  }

  private submodelToCompany(map: Map<string, any>): CompanyDto {
    if (!map.get('name').value) return null;

    console.log(map.get('name').value);

    let address: AddressDto | undefined = undefined;
    const addressAsString = map.get('address');
    if (addressAsString) {
      const [street, cityInformation, country] = map
        .get('address')
        .value.split(',');

      const [postcode, city] = cityInformation.trim().split(' ');
      address = {
        street: street,
        city: city,
        postalCode: postcode,
        country: country,
      };
    }

    const company = {
      name: map.get('name').value,
      email: map.get('email').value,
      phone: map.get('phone').value,
      addresses: [address],
    } as CompanyDto;

    return company;
  }

  private parseStringValue(value: string) {
    if (!value) return null;
    if (typeof value === 'string' && value.startsWith('["'))
      return JSON.parse(value);
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  submodelToMaterial(data: {
    name: string;
    value: Map<string, { name: string; value: string | number | boolean }>;
  }): [MaterialDto, number, boolean?, boolean?] {
    return [
      new MaterialDto(data.name),
      +data.value.get('percentage')?.value,
      !!data.value.get('isRenewable').value,
      !!data.value.get('isPrimary').value,
    ];
  }
}
