/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaginatedData,
  ProductCreateDto,
  ProductDto,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';

@Injectable()
export class SupplierService {
  private readonly http = inject(HttpClient);
  url = environment.baseUrl;

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string,
    additional?: Map<string, string>
  ): Promise<PaginatedData<Partial<ProductDto>>> {
    let params = new HttpParams({
      fromObject: { page, pageSize, sorting, filters },
    });
    if (additional) {
      params = Array.from(additional).reduce(
        (acc, [key, value]) => acc.set(key, value),
        params
      );
    }
    return lastValueFrom(
      this.http.get<PaginatedData<ProductDto>>(
        `${this.url}${ApiUris.supplierProducts}`,
        {
          params,
        }
      )
    );
  }

  getById(id: string): Promise<Partial<ProductDto>> {
    return lastValueFrom(
      this.http.get<ProductDto>(`${this.url}${ApiUris.supplierProducts}/${id}`)
    );
  }

  update(dto: Partial<ProductCreateDto>, id: string): Promise<ProductDto> {
    return lastValueFrom(
      this.http.patch<ProductDto>(
        `${this.url}${ApiUris.supplierProducts}/${id}`,
        dto
      )
    );
  }
}
