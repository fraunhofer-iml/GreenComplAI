/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AnalysisDto,
  DocumentType,
  FileDto,
  PackagingDto,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  ProductOutlierDto,
  ProductUpdateHistoryDto,
  ProductUpdateMapDto,
  WasteCreateDto,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';
import { DataService } from '../data-service/data.service';

@Injectable()
export class ProductsService extends DataService<PaginatedData<ProductDto>> {
  private readonly http = inject(HttpClient);
  url = environment.baseUrl;

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string,
    additional?: Map<string, string>
  ): Promise<PaginatedData<ProductDto>> {
    console.log('fetch data');

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
        `${this.url}${ApiUris.products}`,
        {
          params,
        }
      )
    );
  }

  fetchOutliers(): Promise<ProductOutlierDto[]> {
    return lastValueFrom(
      this.http.get<ProductOutlierDto[]>(
        `${this.url}${ApiUris.products}/outliers`
      )
    );
  }

  searchAll(value?: string): Promise<ProductDto[]> {
    const params = value
      ? new HttpParams().set('value', value)
      : new HttpParams();
    return lastValueFrom(
      this.http.get<ProductDto[]>(`${this.url}${ApiUris.searchProducts}`, {
        params,
      })
    );
  }

  create(dto: ProductCreateDto): Promise<ProductDto> {
    return lastValueFrom(
      this.http.post<ProductDto>(`${this.url}${ApiUris.products}`, dto)
    );
  }

  update(dto: Partial<ProductCreateDto>, id: string): Promise<ProductDto> {
    return lastValueFrom(
      this.http.patch<ProductDto>(`${this.url}${ApiUris.products}/${id}`, dto)
    );
  }

  updateHistory(dto: ProductUpdateHistoryDto, id: string): Promise<ProductDto> {
    return lastValueFrom(
      this.http.patch<ProductDto>(
        `${this.url}${ApiUris.products}/${id}/production-history`,
        dto
      )
    );
  }

  updateBOM(
    dto: Partial<ProductUpdateMapDto>,
    id: string
  ): Promise<ProductDto> {
    return lastValueFrom(
      this.http.patch<ProductDto>(
        `${this.url}${ApiUris.products}/${id}/bill-of-material`,
        dto
      )
    );
  }

  updatePackagings(
    dto: Partial<ProductUpdateMapDto>,
    id: string
  ): Promise<ProductDto> {
    return lastValueFrom(
      this.http.patch<ProductDto>(
        `${this.url}${ApiUris.products}/${id}/packaging`,
        dto
      )
    );
  }

  updateWaste(dto: WasteCreateDto, id: string) {
    return lastValueFrom(
      this.http.patch<ProductDto>(
        `${this.url}${ApiUris.products}/${id}/waste`,
        dto
      )
    );
  }

  getById(id: string): Promise<ProductDto> {
    return lastValueFrom(
      this.http.get<ProductDto>(`${this.url}${ApiUris.products}/${id}`)
    );
  }

  getPreliminary(id: string): Promise<[ProductDto, number][]> {
    return lastValueFrom(
      this.http.get<[ProductDto, number][]>(
        `${this.url}${ApiUris.products}/${id}/preliminary`
      )
    );
  }
  getPackaging(id: string): Promise<[PackagingDto, number][]> {
    console.log('get packaging for product');
    return lastValueFrom(
      this.http.get<[PackagingDto, number][]>(
        `${this.url}${ApiUris.products}/${id}/packaging`
      )
    );
  }

  getAnalysis(amount: number, id: string): Promise<AnalysisDto> {
    const params = new HttpParams().set('amount', amount);
    return lastValueFrom(
      this.http.get<AnalysisDto>(
        `${this.url}${ApiUris.products}/${id}/analysis`,
        {
          params,
        }
      )
    );
  }

  updateFlags(data: string[], id: string): Promise<unknown> {
    return lastValueFrom(
      this.http.patch(`${this.url}${ApiUris.products}/${id}/flags`, {
        flags: data,
      })
    );
  }

  validateOutlier(id: string, keys: string[]) {
    return lastValueFrom(
      this.http.patch(`${this.url}${ApiUris.products}/${id}/outlier`, {
        flags: keys,
      })
    );
  }

  getFiles(id: string): Promise<FileDto[]> {
    return lastValueFrom(
      this.http.get<FileDto[]>(`${this.url}${ApiUris.products}/${id}/files`)
    );
  }

  uploadFile(
    id: string,
    file: File,
    type: DocumentType,
    fileName: string
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('fileName', fileName);

    return lastValueFrom(
      this.http.post<void>(
        `${this.url}${ApiUris.products}/${id}/files`,
        formData
      )
    );
  }

  downloadFile(id: string, path: string): Promise<{ url: string }> {
    return lastValueFrom(
      this.http.get<{ url: string }>(
        `${this.url}${ApiUris.products}/${id}/files/file`,
        {
          params: new HttpParams().set('path', encodeURIComponent(path)),
        }
      )
    );
  }

  deleteFile(productId: string, fileId: string): Promise<void> {
    return lastValueFrom(
      this.http.delete<void>(
        `${this.url}${ApiUris.products}/${productId}/files/${fileId}`
      )
    );
  }
}
