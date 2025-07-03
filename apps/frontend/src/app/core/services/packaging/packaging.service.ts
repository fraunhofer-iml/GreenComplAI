/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PackagingCreateDto,
  PackagingDto,
  PackagingUpdateDto,
  PaginatedData,
  ProductUpdateMapDto,
  WasteCreateDto,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';
import { DataService } from '../data-service/data.service';

@Injectable()
export class PackagingService extends DataService<PaginatedData<PackagingDto>> {
  url = environment.baseUrl;

  constructor(private readonly http: HttpClient) {
    super();
  }

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string
  ): Promise<PaginatedData<PackagingDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('filters', filters)
      .set('sorting', sorting);
    return lastValueFrom(
      this.http.get<PaginatedData<PackagingDto>>(
        `${this.url}${ApiUris.packaging}`,
        {
          params,
        }
      )
    );
  }

  getById(id: string): Promise<PackagingDto> {
    return lastValueFrom(
      this.http.get<PackagingDto>(`${this.url}${ApiUris.packaging}/${id}`)
    );
  }

  getPartPackagings(id: string): Promise<[PackagingDto, number][]> {
    return lastValueFrom(
      this.http.get<[PackagingDto, number][]>(
        `${this.url}${ApiUris.packaging}/${id}/preliminary`
      )
    );
  }

  create(dto: PackagingCreateDto): Promise<PackagingDto> {
    return lastValueFrom(
      this.http.post<PackagingDto>(`${this.url}${ApiUris.packaging}`, dto)
    );
  }

  updatePartPackagigns(dto: ProductUpdateMapDto, id: string) {
    return lastValueFrom(
      this.http.patch<[PackagingDto, number][]>(
        `${this.url}${ApiUris.packaging}/${id}/preliminary`,
        dto
      )
    );
  }

  updateWaste(dto: WasteCreateDto, id: string) {
    return lastValueFrom(
      this.http.patch<[PackagingDto, number][]>(
        `${this.url}${ApiUris.packaging}/${id}/waste`,
        dto
      )
    );
  }

  update(dto: PackagingUpdateDto, id: string) {
    return lastValueFrom(
      this.http.patch<PackagingDto>(
        `${this.url}${ApiUris.packaging}/${id}`,
        dto
      )
    );
  }

  updateFlags(data: string[], id: string): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
