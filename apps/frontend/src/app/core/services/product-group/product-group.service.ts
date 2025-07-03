/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaginatedData,
  ProductGroupCreateDto,
  ProductGroupDto,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';
import { DataService } from '../data-service/data.service';

@Injectable({
  providedIn: 'root',
})
export class ProductGroupService extends DataService<
  PaginatedData<ProductGroupDto>
> {
  url = environment.baseUrl;

  constructor(private readonly http: HttpClient) {
    super();
  }

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string
  ): Promise<PaginatedData<ProductGroupDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('filters', filters)
      .set('sorting', sorting);
    return lastValueFrom(
      this.http.get<PaginatedData<ProductGroupDto>>(
        `${this.url}${ApiUris.groups}`,
        {
          params,
        }
      )
    );
  }

  getById(id: string): Promise<ProductGroupDto> {
    return lastValueFrom(
      this.http.get<ProductGroupDto>(`${this.url}${ApiUris.groups}/${id}`)
    );
  }

  create(dto: ProductGroupCreateDto): Promise<ProductGroupDto> {
    return lastValueFrom(
      this.http.post<ProductGroupDto>(`${this.url}${ApiUris.groups}`, dto)
    );
  }

  update(dto: ProductGroupCreateDto, id: string): Promise<ProductGroupDto> {
    return lastValueFrom(
      this.http.patch<ProductGroupDto>(
        `${this.url}${ApiUris.groups}/${id}`,
        dto
      )
    );
  }

  updateFlags(data: string[], id: string): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
