/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyDto,
  NonUtilizableWasteDto,
  PackagingCreateDto,
  PackagingDto,
  UtilizableWasteDto,
  WasteCreateDto,
  WasteMaterialCreateDto,
} from '@ap2/api-interfaces';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipGrid, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListOption } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { PackagingService } from '../../../core/services/packaging/packaging.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { UploadCSVComponent } from '../../../shared/components/csv-upload/uploadCSV.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { PackagingSelectionComponent } from '../../../shared/components/selection/packaging-selection.component';
import { SuppliersSheetComponent } from '../../../shared/components/sheet/suppliers-sheet/suppliers-sheet.component';
import { WasteCreateComponent } from '../../../shared/components/waste-create/waste-create.component';
import { wasteFormGroup } from '../../../shared/components/waste-create/waste.form-group';
import { ProductPackagingFormGroup } from '../../products/create/model/product-form.model';

@Component({
  selector: 'app-company-create',
  imports: [
    RouterModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    FormsModule,
    MatIcon,
    SuppliersSheetComponent,
    MatChipGrid,
    MatChipsModule,
    WasteCreateComponent,
    PackagingSelectionComponent,
    UploadCSVComponent,
  ],
  providers: [
    PackagingService,
    ProductsService,
    {
      provide: DataService,
      useClass: PackagingService,
    },
  ],
  templateUrl: './create.component.html',
})
export class PackagingCreateComponent {
  packagingForm = new FormGroup({
    weight: new FormControl<number | null>(null, Validators.required),
    name: new FormControl<string | null>('', Validators.required),
    percentageOfRenewableMaterial: new FormControl<number | null>(
      null,
      Validators.required
    ),
    percentageOfRecycledMaterial: new FormControl<number | null>(
      null,
      Validators.required
    ),
    percentageOfRStrategies: new FormControl<number | null>(
      null,
      Validators.required
    ),
    waste: wasteFormGroup(),
    materialName: new FormControl<string | null>('', Validators.required),
    company: new FormControl<string | null>('', Validators.required),
    partPackagings: new FormGroup<ProductPackagingFormGroup>({
      packagings: new FormControl<[PackagingDto, number][]>([], {
        nonNullable: true,
      }),
    }),
  });
  company: CompanyDto | undefined;

  usesImport = false;

  protected readonly ContentType = ContentType;

  constructor(
    public readonly packagingService: PackagingService,
    public readonly productsService: ProductsService,
    public readonly companiesService: CompaniesService
  ) {}

  save() {
    const partPackagingsMap: [string, number][] =
      this.packagingForm.controls.partPackagings.controls.packagings.value.map(
        ([packaging, amount]) => [packaging.id, amount]
      ) ?? [];
    const waste: WasteCreateDto = {
      wasteMaterials: this.packagingForm
        .get('waste')
        ?.value.wasteMaterials.materials.map((material) => ({
          material: material.material as string,
          percentage: material.percentage as number,
        })) as WasteMaterialCreateDto[],
      radioactiveAmount: this.packagingForm.get('waste')?.value
        .radioactiveAmount as number,
      recycledWastePercentage: this.packagingForm.get('waste')?.value
        .recycledWastePercentage as number,
      normalWaste: {
        nonUtilizableWaste: this.packagingForm.get('waste')?.value.normalWaste
          .nonUtilizableWaste as NonUtilizableWasteDto,
        utilizableWaste: this.packagingForm.get('waste')?.value.normalWaste
          .utilizableWaste as UtilizableWasteDto,
      },
      hasHazardousWaste: this.packagingForm.get('waste')?.value
        .hasHazardousWaste as boolean,
      hazardousWaste: this.packagingForm.get('waste')?.value.hasHazardousWaste
        ? {
            nonUtilizableWaste: this.packagingForm.get('waste')?.value
              .hazardousWaste.nonUtilizableWaste as NonUtilizableWasteDto,
            utilizableWaste: this.packagingForm.get('waste')?.value
              .hazardousWaste.utilizableWaste as UtilizableWasteDto,
          }
        : undefined,
    };

    const dto = new PackagingCreateDto(
      Number(this.packagingForm.get('weight')?.value),
      this.packagingForm.get('name')?.value as string,
      Number(this.packagingForm.get('percentageOfBiologicalMaterials')?.value),
      Number(this.packagingForm.get('percentageOfRecycledMaterial')?.value),
      Number(this.packagingForm.get('percentageOfRStrategies')?.value),
      this.packagingForm.get('company')?.value as string,
      this.packagingForm.get('materialName')?.value as string,
      partPackagingsMap,
      [],
      waste
    );
    this.packagingService.create(dto);
  }

  addCompanyId($event: MatListOption[]) {
    this.company = $event[0].value.company;
    this.packagingForm.get('company')?.setValue($event[0].value.company.id);
  }
}
