/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyCreateDto,
  CompanyDto,
  PaginatedData,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';
import { DataService } from '../data-service/data.service';

@Injectable()
export class CompaniesService extends DataService<PaginatedData<CompanyDto>> {
  private readonly http = inject(HttpClient);

  url = environment.baseUrl;

  constructor() {
    super();
  }

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string
  ): Promise<PaginatedData<CompanyDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('filters', filters)
      .set('sorting', sorting);
    return lastValueFrom(
      this.http.get<PaginatedData<CompanyDto>>(
        `${this.url}${ApiUris.companies}`,
        {
          params,
        }
      )
    );
  }

  async searchAll(value: string): Promise<CompanyDto[]> {
    const res = await this.fetchData(1, 10, value, '');
    return res.data || [];
  }

  getById(id: string): Promise<CompanyDto> {
    return lastValueFrom(
      this.http.get<CompanyDto>(`${this.url}${ApiUris.companies}/${id}`)
    );
  }

  create(dto: CompanyCreateDto): Promise<CompanyDto> {
    return lastValueFrom(
      this.http.post<CompanyDto>(
        `${this.url}${ApiUris.associateCompanies}`,
        dto
      )
    );
  }

  createOwn(dto: CompanyCreateDto): Promise<CompanyDto> {
    return lastValueFrom(
      this.http.post<CompanyDto>(`${this.url}${ApiUris.companies}`, dto)
    );
  }

  findOwnCompany(): Promise<CompanyDto> {
    return lastValueFrom(
      this.http.get<CompanyDto>(`${this.url}/companies/user/own`)
    );
  }

  updateCompany(id: string, dto: CompanyCreateDto): Promise<CompanyDto> {
    return lastValueFrom(
      this.http.patch<CompanyDto>(`${this.url}/companies/${id}`, dto)
    );
  }

  updateFlags(data: string[], id: string): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
