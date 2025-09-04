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
  PackagingDto,
  ProductCreateDto,
  ProductDto,
  ProductGroupDto,
} from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { Component, inject, input, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { UploadCSVComponent } from '../../../shared/components/csv-upload/uploadCSV.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { ProductMasterDataFormComponent } from '../../../shared/components/product-master-data-form/product-master-data-form.component';
import { PackagingSelectionComponent } from '../../../shared/components/selection/packaging-selection.component';
import { BaseSheetComponent } from '../../../shared/components/sheet/base/sheet.component';
import { ProductsSheetComponent } from '../../../shared/components/sheet/products-sheet/products-sheet.component';
import { WasteCreateComponent } from '../../../shared/components/waste-create/waste-create.component';
import { WasteFormGroup } from '../../../shared/components/waste-create/waste-form';
import { wasteFormGroup } from '../../../shared/components/waste-create/waste.form-group';
import {
  CRITICAL_RAW_MATERIAL,
  RARE_EARTHS,
} from '../../../shared/constants/inflows';
import { SelectMaterialsComponent } from '../../materials/select-materials/select-materials.component';
import { ProductConstructionService } from './form-construction/product-construction.service';
import {
  addBasicMaterialFormGroup,
  addMaterialFormGroup,
  addRegularMaterialFormGroup,
  materialFormArrayGroup,
  regularMaterialFormArrayGroup,
  removeBasicMaterialFormGroup,
  removeMaterialFormGroup,
  removeRegularMaterialFormGroup,
} from './material.form-group';
import {
  BillOfMaterialFormGroup,
  MasterDataFormGroup,
  ProducedItemsFormGroup,
  ProductPackagingFormGroup,
} from './model/product-form.model';
import { producedItemsFormGroup } from './produced-items.form-group';
import { masterDataFormGroup } from './product.form-group';
import { ProductionHistoryComponent } from './production-history/production-history.component';

@Component({
  selector: 'app-product-create',
  imports: [
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatCheckboxModule,
    MatListModule,
    FormsModule,
    MatAutocompleteModule,
    RouterModule,
    WasteCreateComponent,
    ProductsSheetComponent,
    MatSelectModule,
    BaseSheetComponent,
    SelectMaterialsComponent,
    PackagingSelectionComponent,
    PackagingSelectionComponent,
    ProductMasterDataFormComponent,
    ProductionHistoryComponent,
    UploadCSVComponent,
    RouterModule,
  ],
  providers: [
    {
      provide: DataService,
      useClass: ProductsService,
    },
  ],
  templateUrl: './product-create.component.html',
})
export class ProductCreateComponent {
  private readonly productsService = inject(ProductsService);
  private readonly constructionService = inject(ProductConstructionService);
  private readonly authService = inject(AuthenticationService);

  productGroupId = input<string>();

  masterDataForm: FormGroup<MasterDataFormGroup>;
  readonly ContentType = ContentType;
  producedItemsForm: FormGroup<ProducedItemsFormGroup>;
  packagingsForm: FormGroup<ProductPackagingFormGroup>;
  billOfMaterialForm: FormGroup<BillOfMaterialFormGroup>;
  materialsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
        renewable: FormControl<boolean | null>;
        primary: FormControl<boolean | null>;
      }>
    >;
  }>;
  rareEarthsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>;
  criticalRawMaterialsForm: FormGroup<{
    materials: FormArray<
      FormGroup<{
        material: FormControl<string>;
        percentage: FormControl<number>;
      }>
    >;
  }>;
  wasteForm: FormGroup<WasteFormGroup>;

  supplierSearchValue = signal<string>('');
  groupSearchValue = signal<string>('');
  selectedProducts: [ProductDto, number][] = [];
  selectedGroup = signal<ProductGroupDto | undefined>(undefined);

  currentRole = '';
  AuthRoles = AuthRoles;
  usesImport = false;

  addresses: AddressDto[] = [];
  RARE_EARTHS = RARE_EARTHS;
  CRITICAL_RAW_MATERIAL = CRITICAL_RAW_MATERIAL;

  addMaterialFormGroup = addRegularMaterialFormGroup;
  removeMaterialFormGroup = removeRegularMaterialFormGroup;
  addBasicMaterialFormGroup = addBasicMaterialFormGroup;
  removeBasicMaterialFormGroup = removeBasicMaterialFormGroup;

  createMutation = injectMutation(() => ({
    mutationFn: (dto: ProductCreateDto) => this.productsService.create(dto),
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));
  protected readonly FormGroup = FormGroup;

  constructor() {
    this.masterDataForm = masterDataFormGroup();
    this.producedItemsForm = producedItemsFormGroup();
    this.packagingsForm = new FormGroup<ProductPackagingFormGroup>({
      packagings: new FormControl<[PackagingDto, number][]>([], {
        nonNullable: true,
      }),
    });
    this.materialsForm = regularMaterialFormArrayGroup();
    this.rareEarthsForm = materialFormArrayGroup();
    this.criticalRawMaterialsForm = materialFormArrayGroup();
    this.currentRole = this.authService.getCurrentUserRole();
    this.billOfMaterialForm = new FormGroup<BillOfMaterialFormGroup>({
      billOfMaterialDescription: new FormControl<string>(''),
      billOfMaterial: new FormControl<[ProductDto, number][]>([], {
        nonNullable: true,
      }),
    });
    this.wasteForm = wasteFormGroup();

    this.billOfMaterialForm.controls.billOfMaterial.valueChanges.subscribe(
      () =>
        (this.selectedProducts =
          this.billOfMaterialForm.controls.billOfMaterial.value)
    );
  }

  saveProduct() {
    const product = this.constructionService.constructProductCreateDto(
      this.masterDataForm,
      this.billOfMaterialForm,
      this.wasteForm,
      this.materialsForm,
      this.rareEarthsForm,
      this.criticalRawMaterialsForm,
      this.packagingsForm,
      this.producedItemsForm
    );
    this.createMutation.mutate(product);
  }

  removeProduct(id: string) {
    const index = this.selectedProducts.findIndex(
      (product) => product[0].id === id
    );
    if (index >= 0) this.selectedProducts.splice(index, 1);
  }

  displayFn(company: CompanyDto): string {
    return company ? company.name : '';
  }
}
