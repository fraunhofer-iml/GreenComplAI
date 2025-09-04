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
import { Component, inject, input, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { RegularMaterialsFormGroup } from '../../../features/materials/select-materials/materials-form.model';
import { SelectMaterialsComponent } from '../../../features/materials/select-materials/select-materials.component';
import { ProductGroupCreateComponent } from '../../../features/product-group/create/product-group-create.component';
import {
  addBasicMaterialFormGroup,
  addRegularMaterialFormGroup,
  removeBasicMaterialFormGroup,
  removeRegularMaterialFormGroup,
} from '../../../features/products/create/material.form-group';
import { MasterDataFormGroup } from '../../../features/products/create/model/product-form.model';
import { UNITS } from '../../constants/available-units';
import { CRITICAL_RAW_MATERIAL, RARE_EARTHS } from '../../constants/inflows';
import { BaseSheetComponent } from '../sheet/base/sheet.component';

@Component({
  selector: 'app-product-master-data-form',
  imports: [
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
    MatRadioModule,
  ],
  templateUrl: './product-master-data-form.component.html',
})
export class ProductMasterDataFormComponent implements OnInit {
  private readonly companiesService = inject(CompaniesService);
  private readonly groupService = inject(ProductGroupService);
  readonly authService = inject(AuthenticationService);

  productGroupId = input<string>();
  form = input.required<FormGroup<MasterDataFormGroup>>();

  materialsForm = input.required<FormGroup<RegularMaterialsFormGroup>>();

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

  addMaterialFormGroup = addRegularMaterialFormGroup;
  removeMaterialFormGroup = removeRegularMaterialFormGroup;
  addRegularMaterialFormGroup = addRegularMaterialFormGroup;
  removeRegularMaterialFormGroup = removeRegularMaterialFormGroup;
  addBasicMaterialFormGroup = addBasicMaterialFormGroup;
  removeBasicMaterialFormGroup = removeBasicMaterialFormGroup;

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
    enabled: !this.authService.isSupplier(),
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
    enabled: !this.authService.isSupplier(),
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

  constructor() {
    this.currentRole = this.authService.getCurrentUserRole();
  }

  ngOnInit() {
    if (this.productGroupId()) {
      this.groupSearchValue.set(this.productGroupId() ?? '');
    }

    // Set initial state of importer fields
    if (this.form().controls.supplierIsImporter.value) {
      const supplier = this.form().controls.supplier.value;
      if (typeof supplier === 'object' && supplier) {
        this.form().controls.importerName.patchValue(supplier.name);
        this.form().controls.importerEmail.patchValue(supplier.email);
        this.form().controls.importerPhone.patchValue(supplier.phone);
        this.form().controls.importerAddress.patchValue(
          supplier.addresses?.[0]
            ? `${supplier.addresses[0].street}, ${supplier.addresses[0].postalCode} ${supplier.addresses[0].city}, ${supplier.addresses[0].country}`
            : ''
        );
      }
      this.form().controls.importerName.disable();
      this.form().controls.importerEmail.disable();
      this.form().controls.importerPhone.disable();
      this.form().controls.importerAddress.disable();
    } else {
      this.form().controls.importerName.setValidators([Validators.required]);
      this.form().controls.importerEmail.setValidators([Validators.email]);
      this.form().controls.importerPhone.setValidators([]);
      this.form().controls.importerAddress.setValidators([]);
    }
    this.form().controls.importerName.updateValueAndValidity();
    this.form().controls.importerEmail.updateValueAndValidity();
    this.form().controls.importerPhone.updateValueAndValidity();
    this.form().controls.importerAddress.updateValueAndValidity();

    this.form().controls.supplier.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.supplierSearchValue.set(value);
      } else if (this.currentRole === AuthRoles.BUYER) {
        this.form().controls.manufacturer.patchValue(value);
      } else {
        this.mergeAddresses(value?.addresses ?? []);
      }

      // If supplier is importer, update importer fields
      if (this.form().controls.supplierIsImporter.value) {
        if (typeof value === 'object' && value) {
          this.form().controls.importerName.patchValue(value.name);
          this.form().controls.importerEmail.patchValue(value.email);
          this.form().controls.importerPhone.patchValue(value.phone);
          this.form().controls.importerAddress.patchValue(
            value.addresses?.[0]
              ? `${value.addresses[0].street}, ${value.addresses[0].postalCode} ${value.addresses[0].city}, ${value.addresses[0].country}`
              : ''
          );
        }
      }
    });

    this.form().controls.supplierIsImporter.valueChanges.subscribe((value) => {
      if (value) {
        // If supplier is importer, set importer fields to supplier values and disable them
        const supplier = this.form().controls.supplier.value;
        if (typeof supplier === 'object' && supplier) {
          this.form().controls.importerName.patchValue(supplier.name);
          this.form().controls.importerEmail.patchValue(supplier.email);
          this.form().controls.importerPhone.patchValue(supplier.phone);
          this.form().controls.importerAddress.patchValue(
            supplier.addresses?.[0]
              ? `${supplier.addresses[0].street}, ${supplier.addresses[0].postalCode} ${supplier.addresses[0].city}, ${supplier.addresses[0].country}`
              : ''
          );
        }
        this.form().controls.importerName.disable();
        this.form().controls.importerEmail.disable();
        this.form().controls.importerPhone.disable();
        this.form().controls.importerAddress.disable();
      } else {
        // If supplier is not importer, enable importer fields and clear them
        this.form().controls.importerName.enable();
        this.form().controls.importerEmail.enable();
        this.form().controls.importerPhone.enable();
        this.form().controls.importerAddress.enable();
        this.form().controls.importerName.patchValue('');
        this.form().controls.importerEmail.patchValue('');
        this.form().controls.importerPhone.patchValue('');
        this.form().controls.importerAddress.patchValue('');
        this.form().controls.importerName.setValidators([Validators.required]);
        this.form().controls.importerEmail.setValidators([Validators.email]);
        this.form().controls.importerPhone.setValidators([]);
        this.form().controls.importerAddress.setValidators([]);
      }
      this.form().controls.importerName.updateValueAndValidity();
      this.form().controls.importerEmail.updateValueAndValidity();
      this.form().controls.importerPhone.updateValueAndValidity();
      this.form().controls.importerAddress.updateValueAndValidity();
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

    this.form().controls.circularPrinciple.valueChanges.subscribe((value) => {
      if (value) {
        this.form().controls.circularPrincipleJustification.addValidators(
          Validators.required
        );
        this.form().controls.circularPrincipleMeasureable.addValidators(
          Validators.required
        );
        this.form().controls.circularPrincipleAssumption.addValidators(
          Validators.required
        );
      } else {
        this.form().controls.circularPrincipleJustification.removeValidators(
          Validators.required
        );
        this.form().controls.circularPrincipleMeasureable.removeValidators(
          Validators.required
        );
        this.form().controls.circularPrincipleAssumption.removeValidators(
          Validators.required
        );
      }

      this.form().controls.circularPrincipleJustification.updateValueAndValidity();
      this.form().controls.circularPrincipleMeasureable.updateValueAndValidity();
      this.form().controls.circularPrincipleAssumption.updateValueAndValidity();
    });

    this.form().controls.circularPrincipleMeasureable.valueChanges.subscribe(
      (value) => {
        if (!value) {
          this.form().controls.circularPrincipleAssumption.addValidators(
            Validators.required
          );
        } else {
          this.form().controls.circularPrincipleAssumption.removeValidators(
            Validators.required
          );
        }

        this.form().controls.circularPrincipleAssumption.updateValueAndValidity();
      }
    );

    this.form().controls.reparability.valueChanges.subscribe((change) => {
      if (!change) return;
      if (change > 10) this.form().controls.reparability.patchValue(10);
      if (change < 0) this.form().controls.reparability.patchValue(0);
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
