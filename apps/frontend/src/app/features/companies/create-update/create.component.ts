/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyCreateDto, CompanyDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { Component, inject, input } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  injectMutation,
  injectQuery,
} from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { UploadCSVComponent } from '../../../shared/components/csv-upload/uploadCSV.component';
import { ContentType } from '../../../shared/components/overview/table-content-type.enum';
import { Messages } from '../../../shared/constants/messages';
import { Uris } from '../../../shared/constants/uris';

@Component({
  selector: 'app-company-create',
  imports: [
    RouterModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    FormsModule,
    UploadCSVComponent,
  ],
  providers: [
    {
      provide: DataService,
      useClass: CompaniesService,
    },
  ],
  templateUrl: './create.component.html',
})
export class CompanyCreateComponent {
  private readonly companiesService = inject(CompaniesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id = input<string>();
  callback = input<string>();
  companyData: CompanyDto | undefined;
  companyForm = new FormGroup({
    name: new FormControl<string | null>('', Validators.required),
    email: new FormControl<string | null>('', Validators.required),
    phone: new FormControl<string | null>('', Validators.required),
    addresses: new FormArray<FormGroup>([this.getAddressForm()]),
  });
  companyQuery = injectQuery(() => ({
    queryKey: ['companies', this.id()],
    queryFn: async (): Promise<CompanyDto> => {
      const company = await this.companiesService.getById(this.id() ?? '');
      this.companyForm.patchValue(company);
      this.companyData = company;
      return company;
    },
    enabled: !!this.id(),
  }));

  createMutation = injectMutation(() => ({
    mutationFn: (dto: CompanyCreateDto) => this.companiesService.create(dto),
    onSuccess: async () => {
      this.router.navigate([Uris.companies]);
    },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  createOwnMutation = injectMutation(() => ({
    mutationFn: (dto: CompanyCreateDto) => this.companiesService.createOwn(dto),
    onSuccess: async () => {
      this.router.navigate([Uris.companies]);
    },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  updateMutation = injectMutation(() => ({
    mutationFn: (props: { id: string; dto: CompanyCreateDto }) =>
      this.companiesService.updateCompany(props.id, props.dto),
    onSuccess: async () => {
      toast.success('Erfolgreich aktualisiert');
      this.companyQuery.refetch();
    },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  }));

  protected readonly ContentType = ContentType;

  usesImport = false;

  addAddress(): void {
    (this.companyForm.get('addresses') as FormArray).push(
      this.getAddressForm()
    );
  }

  removeAddress(): void {
    const length = this.companyForm.value.addresses?.length ?? 0;
    if (this.companyForm.value.addresses && length > 1)
      (this.companyForm.get('addresses') as FormArray).removeAt(
        this.companyForm.value.addresses?.length - 1
      );
    else {
      toast.error(Messages.errorRemoveAddress);
    }
  }

  save() {
    const dto: CompanyCreateDto = this.companyForm.value as CompanyCreateDto;

    if (this.id()) {
      this.updateMutation.mutate({ id: this.id() ?? '', dto: dto });
      this.navigateToCallbackIfSet();
      return;
    }

    const isOwnCompany = this.route.snapshot.queryParamMap.get('own');

    if (isOwnCompany === 'true') {
      this.createOwnMutation.mutate(dto);
    } else {
      this.createMutation.mutate(dto);
    }
    this.navigateToCallbackIfSet();
  }

  private navigateToCallbackIfSet() {
    if (this.callback()) {
      this.router.navigate([this.callback()]);
    }
  }

  private getAddressForm(): FormGroup {
    return new FormGroup({
      street: new FormControl<string | null>('', Validators.required),
      city: new FormControl<string | null>('', Validators.required),
      postalCode: new FormControl<string | null>('', Validators.required),
      country: new FormControl<string | null>('', Validators.required),
    });
  }
}
