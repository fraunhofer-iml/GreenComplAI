/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AddressDto,
  AuthRoles,
  CompanyDto,
  ProductDto,
  ProductGroupDto,
  VariantDto,
} from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, input, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { SelectMaterialsComponent } from '../../../features/materials/select-materials/select-materials.component';
import { ProductGroupCreateComponent } from '../../../features/product-group/create/product-group-create.component';
import {
  addMaterialFormGroup,
  removeMaterialFormGroup,
} from '../../../features/products/create/material.form-group';
import { MasterDataFormGroup } from '../../../features/products/create/model/product-form.model';
import { UNITS } from '../../constants/available-units';
import { CRITICAL_RAW_MATERIAL, RARE_EARTHS } from '../../constants/inflows';
import { BaseSheetComponent } from '../sheet/base/sheet.component';

@Component({
  selector: 'app-product-master-data-form',
  imports: [
    CommonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
    MatChipsModule,
    MatAutocompleteModule,
    BaseSheetComponent,
    ProductGroupCreateComponent,
    SelectMaterialsComponent,
    MatCheckboxModule,
  ],
  templateUrl: './product-master-data-form.component.html',
})
export class ProductMasterDataFormComponent implements OnInit {
  productGroupId = input<string>();
  form = input.required<FormGroup<MasterDataFormGroup>>();

  materialsForm = input.required<
    FormGroup<{
      materials: FormArray<
        FormGroup<{
          material: FormControl<string>;
          percentage: FormControl<number>;
        }>
      >;
    }>
  >();

  rareEarthsForm = input.required<
    FormGroup<{
      materials: FormArray<
        FormGroup<{
          material: FormControl<string>;
          percentage: FormControl<number>;
        }>
      >;
    }>
  >();

  criticalRawMaterialsForm = input.required<
    FormGroup<{
      materials: FormArray<
        FormGroup<{
          material: FormControl<string>;
          percentage: FormControl<number>;
        }>
      >;
    }>
  >();

  supplierSearchValue = signal<string>('');
  groupSearchValue = signal<string>('');
  selectedProducts: { product: ProductDto; amount: number }[] = [];
  selectedGroup = signal<ProductGroupDto | undefined>(undefined);

  currentRole = '';
  AuthRoles = AuthRoles;

  addresses: AddressDto[] = [];

  RARE_EARTHS = RARE_EARTHS;
  CRITICAL_RAW_MATERIAL = CRITICAL_RAW_MATERIAL;

  addMaterialFormGroup = addMaterialFormGroup;
  removeMaterialFormGroup = removeMaterialFormGroup;

  associatedCompaniesQuery = injectQuery(() => ({
    queryKey: ['searchSuppliers', this.supplierSearchValue()],
    queryFn: async () => {
      return this.companiesService.fetchData(
        1,
        5,
        this.supplierSearchValue(),
        '{}'
      );
    },
  }));

  groupsQuery = injectQuery(() => ({
    queryKey: ['getProductGroups', this.groupSearchValue()],
    queryFn: async () => {
      const groups = await this.groupService.fetchData(
        1,
        5,
        this.groupSearchValue(),
        '{}'
      );
      const selectedGroup = groups.data?.find(
        (g) => g.id === this.productGroupId()
      );
      if (selectedGroup) this.setProductGroup(selectedGroup);
      return groups;
    },
  }));

  ownCompanyQuery = injectQuery(() => ({
    queryKey: ['manufacturer', this.associatedCompaniesQuery.data()],
    queryFn: async () => {
      const res = await this.companiesService.findOwnCompany();
      this.form().controls.manufacturer.patchValue(res);
      this.associatedCompaniesQuery.data()?.data?.push(res);
      return res;
    },
    enabled:
      this.currentRole === AuthRoles.SUSTAINABILITY_MANAGER &&
      !!this.associatedCompaniesQuery.data(),
  }));

  protected readonly FormGroup = FormGroup;
  UNITS = UNITS;

  constructor(
    public readonly productsService: ProductsService,
    private readonly companiesService: CompaniesService,
    private readonly authService: AuthenticationService,
    private readonly groupService: ProductGroupService
  ) {
    this.currentRole = this.authService.getCurrentUserRole();
  }

  ngOnInit() {
    if (this.productGroupId()) {
      this.groupSearchValue.set(this.productGroupId() ?? '');
    }

    this.form().controls.supplier.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.supplierSearchValue.set(value);
      } else if (this.currentRole === AuthRoles.BUYER) {
        this.form().controls.manufacturer.patchValue(value);
      } else {
        this.mergeAddresses(value?.addresses ?? []);
      }
    });

    this.form().controls.manufacturer.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.supplierSearchValue.set(value);
      } else {
        this.mergeAddresses(value?.addresses ?? []);
      }
    });

    this.form().controls.productGroup.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.groupSearchValue.set(value);
      } else if (value) {
        this.selectedGroup.set(value);
      }
    });
  }

  private mergeAddresses(addresses: AddressDto[]) {
    this.addresses = addresses.reduce(
      (acc, item) => {
        return acc.some((i) => item.id === i.id) ? acc : [...acc, item];
      },
      [...this.addresses]
    );
  }

  setProductGroup(event: ProductGroupDto): void {
    this.form().controls.productGroup.patchValue(event);
  }

  displayFn(company: CompanyDto): string {
    return company ? company.name : '';
  }

  compareAddresses(address1: string, address2: AddressDto) {
    return address1 === address2.id;
  }

  compareVariants(v1: VariantDto, v2: VariantDto) {
    return v1.id === v2.id;
  }
}
