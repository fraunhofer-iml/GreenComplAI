/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AddressDto,
  CompanyDto,
  MaterialDto,
  PackagingDto,
  ProductDto,
  ProductEntity,
  ProductEntityList,
  ProductGroupDto,
} from '@ap2/api-interfaces';
import { toWasteDto } from '../waste/waste.mapper';

function transformMaterialToDto(material: { name: string }): MaterialDto {
  return new MaterialDto(material.name);
}

function transformMaterials(
  materials: {
    material: { name: string };
    percentage: number;
    renewable?: boolean | null;
    primary?: boolean | null;
  }[]
): [MaterialDto, number, boolean?, boolean?][] {
  return materials.map((m) => [
    transformMaterialToDto(m.material),
    m.percentage,
    m.renewable ?? undefined,
    m.primary ?? undefined,
  ]);
}

function transformRareEarthsOrCriticalMaterials(
  materials: { material: { name: string }; percentage: number }[]
): [MaterialDto, number][] {
  return materials.map((m) => [
    transformMaterialToDto(m.material),
    m.percentage,
  ]);
}

function toCompanyDtoFromSupplier(supplier: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  flags: string[] | null;
  addresses: {
    id: string;
    street: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  }[];
}): CompanyDto {
  return new CompanyDto(
    supplier.id,
    supplier.name,
    supplier.email ?? '',
    supplier.phone ?? '',
    supplier.addresses.map(
      (addr) =>
        new AddressDto(
          addr.street ?? '',
          addr.city ?? '',
          addr.postalCode ?? '',
          addr.country ?? '',
          addr.id
        )
    ),
    supplier.flags ?? []
  );
}

export function toProductDto(
  entity: ProductEntity | null,
  packagings?: [PackagingDto, number][]
): ProductDto | null {
  if (!entity) {
    return null;
  }

  const supplier = entity.supplier
    ? toCompanyDtoFromSupplier(entity.supplier)
    : undefined;
  const manufacturer = entity.manufacturer
    ? toCompanyDtoFromSupplier(entity.manufacturer)
    : undefined;
  const waste = entity.waste ? toWasteDto(entity.waste) : undefined;
  const warehouseLocation = entity.warehouseLocation
    ? new AddressDto(
        entity.warehouseLocation.street ?? '',
        entity.warehouseLocation.city ?? '',
        entity.warehouseLocation.postalCode ?? '',
        entity.warehouseLocation.country ?? '',
        entity.warehouseLocation.id
      )
    : undefined;
  const productionLocation = entity.productionLocation
    ? new AddressDto(
        entity.productionLocation.street ?? '',
        entity.productionLocation.city ?? '',
        entity.productionLocation.postalCode ?? '',
        entity.productionLocation.country ?? '',
        entity.productionLocation.id
      )
    : undefined;
  const productGroup = entity.productGroup
    ? new ProductGroupDto(
        entity.productGroup.id,
        entity.productGroup.name,
        entity.productGroup.description,
        entity.productGroup.flags ?? []
      )
    : undefined;

  return new ProductDto(
    entity.id,
    entity.name,
    entity.description ?? '',
    entity.category ?? '',
    entity.weight ?? 0,
    entity.unit ?? '',
    entity.price ?? 0,
    entity.dimensions ?? '',
    entity.percentageOfBiologicalMaterials ?? 0,
    entity.durability ?? 0,
    entity.durabilityDifference ?? 0,
    entity.reparability ?? 0,
    transformRareEarthsOrCriticalMaterials(entity.rareEarths ?? []),
    transformRareEarthsOrCriticalMaterials(entity.criticalRawMaterials ?? []),
    entity.billOfMaterialDescription ?? '',
    entity.flags ?? [],
    entity.outlier ?? [],
    supplier,
    entity.importerName ?? undefined,
    entity.importerEmail ?? undefined,
    entity.importerPhone ?? undefined,
    entity.importerAddress ?? undefined,
    manufacturer,
    waste,
    transformMaterials(entity.materials ?? []),
    entity.productId,
    productGroup,
    packagings ?? [],
    warehouseLocation,
    productionLocation,
    entity.wasteFlow?.name,
    undefined,
    entity.waterUsed ?? undefined,
    entity.productCarbonFootprint ?? undefined,
    entity.isSellable ?? false,
    entity.cascadePrinciple ?? undefined,
    entity.certificationSystem ?? undefined,
    entity.circularPrinciple ?? false,
    entity.productionHistory?.map((ph) => ({
      amount: ph.amount,
      year: ph.year,
    })) ?? [],
    entity.digitalProductPassportUrl ?? undefined,
    entity.taricCode ?? undefined,
    entity.gtin ?? undefined
  );
}

export function toProductDtoList(entity: ProductEntityList): ProductDto {
  const supplier = entity.supplier
    ? toCompanyDtoFromSupplier(entity.supplier)
    : undefined;
  const manufacturer = entity.manufacturer
    ? toCompanyDtoFromSupplier(entity.manufacturer)
    : undefined;
  // ProductEntityList waste doesn't include normalWaste and hazardousWaste, so we can't use toWasteDto
  const waste = undefined;
  const productGroup = entity.productGroup
    ? new ProductGroupDto(
        entity.productGroup.id,
        entity.productGroup.name,
        entity.productGroup.description,
        entity.productGroup.flags ?? []
      )
    : undefined;

  return new ProductDto(
    entity.id,
    entity.name,
    entity.description ?? '',
    entity.category ?? '',
    entity.weight ?? 0,
    entity.unit ?? '',
    entity.price ?? 0,
    entity.dimensions ?? '',
    entity.percentageOfBiologicalMaterials ?? 0,
    entity.durability ?? 0,
    entity.durabilityDifference ?? 0,
    entity.reparability ?? 0,
    transformRareEarthsOrCriticalMaterials(entity.rareEarths),
    transformRareEarthsOrCriticalMaterials(entity.criticalRawMaterials),
    entity.billOfMaterialDescription ?? '',
    entity.flags ?? [],
    entity.outlier ?? [],
    supplier,
    entity.importerName ?? undefined,
    entity.importerEmail ?? undefined,
    entity.importerPhone ?? undefined,
    entity.importerAddress ?? undefined,
    manufacturer,
    waste,
    transformMaterials(entity.materials),
    entity.productId,
    productGroup,
    [],
    undefined,
    undefined,
    entity.wasteFlow?.name,
    undefined,
    entity.waterUsed ?? undefined,
    entity.productCarbonFootprint ?? undefined,
    entity.isSellable ?? false,
    entity.cascadePrinciple ?? undefined,
    entity.certificationSystem ?? undefined,
    entity.circularPrinciple ?? false,
    [],
    entity.digitalProductPassportUrl ?? undefined,
    entity.taricCode ?? undefined,
    entity.gtin ?? undefined
  );
}
