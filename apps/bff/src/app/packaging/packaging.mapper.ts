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
  PackagingEntity,
  PackagingEntityList,
} from '@ap2/api-interfaces';
import { toWasteDto } from '../waste/waste.mapper';

function transformMaterialsToDto(
  materials: {
    material: { name: string };
    percentage: number;
    renewable?: boolean | null;
    primary?: boolean | null;
  }[]
): [MaterialDto, number, boolean?, boolean?][] {
  return materials.map((m) => [
    new MaterialDto(m.material.name),
    m.percentage,
    m.renewable ?? undefined,
    m.primary ?? undefined,
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

export function toPackagingDto(
  entity: PackagingEntity | null
): PackagingDto | null {
  if (!entity) {
    return null;
  }

  if (!entity.supplier) {
    throw new Error(`Packaging with id '${entity.id}' must have a supplier`);
  }

  const supplier = toCompanyDtoFromSupplier(entity.supplier);

  return new PackagingDto(
    entity.id,
    entity.name,
    entity.weight,
    entity.percentageOfRenewableMaterial ?? 0,
    entity.percentageOfRecycledMaterial ?? 0,
    entity.percentageOfRStrategies ?? 0,
    supplier,
    entity.flags ?? [],
    entity.waste ? toWasteDto(entity.waste) : undefined,
    [],
    entity.supplier.name,
    transformMaterialsToDto(entity.materials)
  );
}

export function toPackagingDtoList(entity: PackagingEntityList): PackagingDto {
  if (!entity.supplier) {
    throw new Error(`Packaging with id '${entity.id}' must have a supplier`);
  }

  const supplier = toCompanyDtoFromSupplier(entity.supplier);

  return new PackagingDto(
    entity.id,
    entity.name,
    entity.weight,
    entity.percentageOfRenewableMaterial ?? 0,
    entity.percentageOfRecycledMaterial ?? 0,
    entity.percentageOfRStrategies ?? 0,
    supplier,
    entity.flags ?? [],
    undefined,
    [],
    entity.supplier.name,
    transformMaterialsToDto(entity.materials)
  );
}
