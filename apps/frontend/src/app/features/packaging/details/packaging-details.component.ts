/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyDto,
  PackagingDto,
  PackagingUpdateDto,
} from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { PackagingService } from '../../../core/services/packaging/packaging.service';
import { BaseSheetComponent } from '../../../shared/components/sheet/base/sheet.component';
import { Uris } from '../../../shared/constants/uris';
import { ProductWasteComponent } from '../../products/details/product-waste/product-waste.component';
import { PartPackagingComponent } from './part-packaging/part-packaging.component';

@Component({
  selector: 'app-packaging-details',
  imports: [
    CommonModule,
    MatButtonModule,
    RouterModule,
    MatIconModule,
    PartPackagingComponent,
    ProductWasteComponent,
    BaseSheetComponent,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
  ],
  providers: [
    QueryClient,
    { provide: DataService, useClass: PackagingService },
  ],
  templateUrl: './packaging-details.component.html',
})
export class PackagingDetailsComponent implements OnInit {
  id = input<string>();
  supplierSearchValue = signal<string>('');

  Uris = Uris;
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

    materialName: new FormControl<string | null>('', Validators.required),
    supplier: new FormControl<CompanyDto | string | null>(null),
  });
  private readonly packagingService = inject(PackagingService);
  packagingQuery = injectQuery(() => ({
    queryKey: ['packaging', this.id()],
    queryFn: async (): Promise<PackagingDto> => {
      const res = await this.packagingService.getById(this.id() ?? '');
      this.packagingForm.patchValue({
        ...res,
        materialName: res.material.name,
      });
      return res;
    },
    enabled: !!this.id(),
  }));
  updateMutation = injectMutation(() => ({
    mutationFn: async (dto: PackagingUpdateDto) =>
      await this.packagingService.update(dto, this.id() ?? ''),
    onSuccess: () => {
      this.packagingQuery.refetch();
    },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));
  private readonly companiesService = inject(CompaniesService);
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
  private readonly router = inject(Router);
  private readonly queryClient = inject(QueryClient);

  ngOnInit() {
    this.packagingForm.controls.supplier.valueChanges.subscribe((value) => {
      if (typeof value === 'string') {
        this.supplierSearchValue.set(value);
      }
    });
  }

  displayFn(company: CompanyDto): string {
    return company ? company.name : '';
  }

  save() {
    const dto: PackagingUpdateDto = {
      ...this.packagingForm.value,
      materialId: this.packagingForm.value.materialName ?? '',
      supplierId:
        typeof this.packagingForm.value.supplier === 'object'
          ? (this.packagingForm.value.supplier?.id ?? '')
          : '',
    } as PackagingUpdateDto;

    this.updateMutation.mutate(dto);
  }
}
