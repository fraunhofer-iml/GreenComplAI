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
  AddressEntity,
  CompanyEntity,
  CRITICAL_RAW_MATERIALS,
  CriticalRawMaterials,
  MaterialEntity,
  PackagingEntity,
  ProductEntity,
} from '@ap2/api-interfaces';
import { Injectable } from '@nestjs/common';
import {
  CircularPropertiesSubmodule,
  ESRSynergiesSubmodule,
} from './submodule.types';

@Injectable()
export class ProductImportService {
  setIdentificationDetails(
    submodelElements: ISubmodelElement[]
  ): Partial<ProductEntity> {
    const submodelMap = new Map<string, any>();

    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const supplier = this.submodelToCompany(submodelMap.get('supplier')?.value);

    const importer = this.submodelToCompany(submodelMap.get('importer')?.value);

    const submodelData: Partial<ProductEntity> = {
      productId: submodelMap.get('uniqueProductIdentifier')?.value,
      gtin: submodelMap.get('gtin')?.value,
      taricCode: submodelMap.get('taricCode')?.value,
      supplier: supplier,
      importerName: importer?.name,
      importerAddress:
        importer &&
        Array.isArray(importer.addresses) &&
        importer.addresses.length > 0
          ? `${importer.addresses[0].street}, ${importer.addresses[0].postalCode} ${importer.addresses[0].city}, ${importer.addresses[0].country}`
          : null,
      importerEmail: importer?.email,
      importerPhone: importer?.phone,
    };

    return submodelData;
  }

  getCircularProperties(
    submodelElements: ISubmodelElement[]
  ): CircularPropertiesSubmodule {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: CircularPropertiesSubmodule = {
      concerningSubstances: [],
      disassemblyInstructions: submodelMap.get('disassemblyInstructions')
        ?.value,
      repairabilityScore: submodelMap.get('repairabilityScore')?.value,
    } as CircularPropertiesSubmodule;

    return submodel;
  }

  getESRSynergiesSubmodel(
    submodelElements: ISubmodelElement[]
  ): ESRSynergiesSubmodule {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const submodel: ESRSynergiesSubmodule = {
      waterFootprint: submodelMap.get('waterFootprint')?.value,
      productCarbonFootprint: submodelMap.get('productCarbonFootprint')?.value,
      socialAspects: submodelMap.get('socialAspects')?.value,
    } as ESRSynergiesSubmodule;

    return submodel;
  }

  getPackagingSubmodule(
    submodelElements: ISubmodelElement[]
  ): PackagingEntity[] {
    if (!submodelElements || submodelElements.length === 0) return [];

    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const materials: PackagingEntity[] = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = submodelMap.get(`packagingMaterial_${index - 1}`);

      const packaging: PackagingEntity = {
        name: element.value?.get('name'),
        weight: element.value?.get('weight'),
      } as PackagingEntity;

      materials.push(packaging);
    }

    return materials;
  }

  getMaterialCompositionSubmodel(submodelElements: ISubmodelElement[]): {
    criticalRawMaterials: MaterialEntity[];
    materials: MaterialEntity[];
  } {
    const submodelMap = new Map<string, any>();
    this.mapSubmodelsToMap(submodelMap, submodelElements);

    const items: MaterialEntity[] = [];
    for (let index = 1; index < submodelElements.length; index++) {
      const element = this.submodelToMaterial(
        submodelMap.get(`material_${index - 1}`)
      );

      items.push(element);
    }

    const materials: MaterialEntity[] = [];

    const criticalRawMaterials: MaterialEntity[] = [];
    items.forEach((m) =>
      CRITICAL_RAW_MATERIALS.includes(m.materialName as CriticalRawMaterials)
        ? criticalRawMaterials.push(m)
        : materials.push(m)
    );

    return { criticalRawMaterials, materials };
  }

  private mapSubmodelsToMap(
    map: Map<string, unknown>,
    submodelElements: ISubmodelElement[]
  ): void {
    (submodelElements ?? []).forEach((element) => {
      if (element.modelType() === ModelType.Property) {
        const value = (element as Property).value;
        const parsedValue = this.parseStringValue(value);
        map.set(element.idShort, {
          name: element.displayName[0]?.text,
          value: parsedValue,
        });
      }
      if (element.modelType() === ModelType.SubmodelElementCollection) {
        const nestedMap = new Map<string, unknown>();
        this.mapSubmodelsToMap(
          nestedMap,
          (element as SubmodelElementCollection).value
        );
        map.set(element.idShort, {
          name: element.displayName[0]?.text,
          value: nestedMap,
        });
      }
    });
  }

  private submodelToCompany(map: Map<string, any>): CompanyEntity {
    if (!map || !map.get('name')?.value) return null;

    let address: AddressEntity | undefined = undefined;
    const addressAsString = map.get('address');
    if (addressAsString) {
      const [street, cityInformation, country] = map
        .get('address')
        .value.split(',');

      const [postcode, city] = cityInformation.trim().split(' ');
      address = {
        id: null,
        street: street,
        city: city,
        postalCode: postcode,
        country: country,
        companyId: null,
      };
    }

    const company = {
      name: map.get('name').value,
      email: map.get('email').value,
      phone: map.get('phone').value,
      addresses: [address],
    } as CompanyEntity;

    return company;
  }

  private parseStringValue(
    value: string
  ): string | string[] | number | boolean {
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
  }): MaterialEntity {
    return {
      material: { name: data.name, id: null },
      productId: null,
      materialName: data.name,
      percentage: +(data.value.get('percentage')?.value ?? 0),
      primary: !!(data.value.get('isPrimary')?.value ?? false),
      renewable: !!(data.value.get('isRenewable')?.value ?? false),
    };
  }
}
