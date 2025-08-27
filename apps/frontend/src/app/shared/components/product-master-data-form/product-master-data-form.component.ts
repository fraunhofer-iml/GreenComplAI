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
import { SelectMaterialsComponent } from '../../../features/materials/select-materials/select-materials.component';
import { ProductGroupCreateComponent } from '../../../features/product-group/create/product-group-create.component';
import {
  addMaterialFormGroup,
  removeMaterialFormGroup,
} from '../../../features/products/create/material.form-group';
import { MasterDataFormGroup } from '../../../features/products/create/model/product-form.model';
import { UNITS } from '../../constants/available-units';
import { CRITICAL_RAW_MATERIAL, RARE_EARTHS } from '../../constants/inflows';
import { autocompleteValidator } from '../../utils/autocomplete.validator';
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

    // Set initial state of importer field
    if (this.form().controls.supplierIsImporter.value) {
      this.form().controls.importer.patchValue(
        this.form().controls.supplier.value
      );
      this.form().controls.importer.disable();
      this.form().controls.importer.clearValidators();
    } else {
      this.form().controls.importer.setValidators([
        Validators.required,
        autocompleteValidator(),
      ]);
    }
    this.form().controls.importer.updateValueAndValidity();

    this.form().controls.supplier.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.supplierSearchValue.set(value);
      } else if (this.currentRole === AuthRoles.BUYER) {
        this.form().controls.manufacturer.patchValue(value);
      } else {
        this.mergeAddresses(value?.addresses ?? []);
      }

      // If supplier is importer, update importer field
      if (this.form().controls.supplierIsImporter.value) {
        this.form().controls.importer.patchValue(value);
      }
    });

    this.form().controls.supplierIsImporter.valueChanges.subscribe((value) => {
      if (value) {
        // If supplier is importer, set importer to supplier and disable importer field
        this.form().controls.importer.patchValue(
          this.form().controls.supplier.value
        );
        this.form().controls.importer.disable();
        this.form().controls.importer.clearValidators();
      } else {
        // If supplier is not importer, enable importer field and clear it
        this.form().controls.importer.enable();
        this.form().controls.importer.patchValue(null);
        this.form().controls.importer.setValidators([
          Validators.required,
          autocompleteValidator(),
        ]);
      }
      this.form().controls.importer.updateValueAndValidity();
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
