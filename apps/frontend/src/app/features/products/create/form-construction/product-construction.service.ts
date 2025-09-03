/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MaterialDto,
  ProductCreateDto,
  ProductMasterDataDto,
  ProductUpdateDto,
  ProductUpdateHistoryDto,
  ProductUpdateMapDto,
} from '@ap2/api-interfaces';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { WasteFormGroup } from '../../../../shared/components/waste-create/waste-form';
import {
  MaterialsFormGroup,
  RegularMaterialsFormGroup,
} from '../../../materials/select-materials/materials-form.model';
import {
  BillOfMaterialFormGroup,
  MasterDataFormGroup,
  ProducedItemsFormGroup,
  ProductPackagingFormGroup,
} from '../model/product-form.model';

@Injectable()
export class ProductConstructionService {
  constructProductCreateDto(
    formData: FormGroup<MasterDataFormGroup>,
    billOfMaterialForm: FormGroup<BillOfMaterialFormGroup>,
    wasteForm: FormGroup<WasteFormGroup>,
    materialsForm: FormGroup<RegularMaterialsFormGroup>,
    rareEarthsForm: FormGroup<MaterialsFormGroup>,
    criticalRawMaterialsForm: FormGroup<MaterialsFormGroup>,
    packagingsForm: FormGroup<ProductPackagingFormGroup>,
    productionHistoryForm: FormGroup<ProducedItemsFormGroup>
  ): ProductCreateDto {
    const dto: ProductCreateDto = {
      ...formData.value,
      billOfMaterial: Array.from(
        billOfMaterialForm.value.billOfMaterial?.map((item) => [
          item[0],
          item[1],
        ]) ?? new Map()
      ),
      billOfMaterialDescription:
        billOfMaterialForm.value.billOfMaterialDescription,
      waste: {
        ...wasteForm.value,
        wasteMaterials: materialsForm.value.materials
          ?.filter((m) => m.material && m.percentage)
          .map((m) => ({
            material: m.material,
            percentage: m.percentage,
          })),
      },
      supplier:
        typeof formData.value.supplier === 'object'
          ? (formData.value.supplier?.id ?? '')
          : '',
      importerName: formData.value.supplierIsImporter
        ? typeof formData.value.supplier === 'object'
          ? (formData.value.supplier?.name ?? '')
          : ''
        : formData.value.importerName || '',
      importerEmail: formData.value.supplierIsImporter
        ? typeof formData.value.supplier === 'object'
          ? (formData.value.supplier?.email ?? '')
          : ''
        : formData.value.importerEmail || '',
      importerPhone: formData.value.supplierIsImporter
        ? typeof formData.value.supplier === 'object'
          ? (formData.value.supplier?.phone ?? '')
          : ''
        : formData.value.importerPhone || '',
      importerAddress: formData.value.supplierIsImporter
        ? typeof formData.value.supplier === 'object'
          ? formData.value.supplier?.addresses?.[0]
            ? `${formData.value.supplier.addresses[0].street}, ${formData.value.supplier.addresses[0].postalCode} ${formData.value.supplier.addresses[0].city}, ${formData.value.supplier.addresses[0].country}`
            : ''
          : ''
        : formData.value.importerAddress || '',
      manufacturer:
        typeof formData.value.manufacturer === 'object'
          ? (formData.value.manufacturer?.id ?? '')
          : '',
      packagings: packagingsForm.value?.packagings?.map(
        ([packaging, amount]) => [packaging.id, amount]
      ),
      materials: materialsForm.value.materials?.map((m) => ({
        material: m.material,
        percentage: m.percentage,
        renewable: m.renewable,
      })),
      productGroup:
        typeof formData.value.productGroup === 'object'
          ? (formData.value.productGroup?.id ?? '')
          : '',
      variant:
        typeof formData.value.variant === 'object'
          ? (formData.value.variant?.id ?? '')
          : '',
      criticalRawMaterials: criticalRawMaterialsForm.value.materials?.map(
        (m) => ({
          material: m.material,
          percentage: m.percentage,
        })
      ),
      rareEarths: rareEarthsForm.value.materials?.map((e) => ({
        material: e.material,
        percentage: e.percentage,
      })),
      productionHistory: this.transformHistory(productionHistoryForm),
    } as ProductCreateDto;
    return dto;
  }

  createMasterDataDto(
    masterData: FormGroup<MasterDataFormGroup>
  ): ProductMasterDataDto {
    return {
      ...masterData.value,

      productGroup:
        typeof masterData.value.productGroup === 'object'
          ? (masterData.value.productGroup?.id ?? '')
          : '',
      variant:
        typeof masterData.value.variant === 'object'
          ? (masterData.value.variant?.id ?? '')
          : '',
      supplier:
        typeof masterData.value.supplier === 'object'
          ? (masterData.value.supplier?.id ?? '')
          : '',
      importerName: masterData.value.supplierIsImporter
        ? typeof masterData.value.supplier === 'object'
          ? (masterData.value.supplier?.name ?? '')
          : ''
        : masterData.value.importerName || '',
      importerEmail: masterData.value.supplierIsImporter
        ? typeof masterData.value.supplier === 'object'
          ? (masterData.value.supplier?.email ?? '')
          : ''
        : masterData.value.importerEmail || '',
      importerPhone: masterData.value.supplierIsImporter
        ? typeof masterData.value.supplier === 'object'
          ? (masterData.value.supplier?.phone ?? '')
          : ''
        : masterData.value.importerPhone || '',
      importerAddress: masterData.value.supplierIsImporter
        ? typeof masterData.value.supplier === 'object'
          ? masterData.value.supplier?.addresses?.[0]
            ? `${masterData.value.supplier.addresses[0].street}, ${masterData.value.supplier.addresses[0].postalCode} ${masterData.value.supplier.addresses[0].city}, ${masterData.value.supplier.addresses[0].country}`
            : ''
          : ''
        : masterData.value.importerAddress || '',
      manufacturer:
        typeof masterData.value.manufacturer === 'object'
          ? (masterData.value.manufacturer?.id ?? '')
          : '',
      productionLocation: masterData.value.productionLocation ?? '',

      warehouseLocation: masterData.value.warehouseLocation ?? '',
    } as ProductMasterDataDto;
  }

  createUpdateBOMDto(
    form: FormGroup<BillOfMaterialFormGroup>
  ): ProductUpdateMapDto {
    return {
      description: form.controls.billOfMaterialDescription.value ?? '',
      map: form.controls.billOfMaterial.value.map((item) => [
        item[0].id,
        item[1],
      ]),
    };
  }

  createUpdatePackagingDto(
    packagingsForm: FormGroup<ProductPackagingFormGroup>
  ): ProductUpdateMapDto {
    const dto: ProductUpdateMapDto = {
      map: (packagingsForm.value.packagings ?? []).map(
        ([packaging, amount]) => [packaging.id, amount]
      ),
    };
    return dto;
  }

  createUpdateProductionHistoryDto(
    productionHistoryForm: FormGroup<ProducedItemsFormGroup>
  ): ProductUpdateHistoryDto {
    const history: [number, number][] = [];
    (productionHistoryForm.value.producedItems ?? []).forEach((i) => {
      if (i.amount && i.year) history.push([i.year?.getFullYear(), i.amount]);
    });
    return {
      history: history,
    };
  }

  transformHistory(history: FormGroup<ProducedItemsFormGroup>) {
    return (history.value.producedItems ?? [])
      .filter((i) => i.amount && i.year)
      .map((i) => ({ amount: i.amount, year: i.year?.getFullYear() }));
  }

  transformMaterialMap(materials: [MaterialDto, number][]) {
    return materials?.map((m) => ({
      material: m[0].name,
      percentage: m[1],
    }));
  }

  createUpdateDto(
    form: FormGroup<MasterDataFormGroup>,
    materials: FormGroup<RegularMaterialsFormGroup>,
    criticalRawMaterials: FormGroup<MaterialsFormGroup>,
    rareEarths: FormGroup<MaterialsFormGroup>
  ): ProductUpdateDto {
    return {
      masterData: this.createMasterDataDto(form),
      materials: materials.controls.materials.value,
      criticalRawMaterials: criticalRawMaterials.controls.materials.value,
      rareEarths: rareEarths.controls.materials.value,
    } as ProductUpdateDto;
  }
}
