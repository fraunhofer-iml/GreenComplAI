/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreateReportDto,
  FinancialImpactCreateDto,
  MeasureCreateDto,
  MeasureDto,
  PaginatedData,
  ReportDto,
  StrategyDto,
} from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';
import { DataService } from '../data-service/data.service';

@Injectable()
export class ReportsService extends DataService<PaginatedData<ReportDto>> {
  private readonly http = inject(HttpClient);

  url = environment.baseUrl;

  fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string,
    additional?: Map<string, string>
  ): Promise<PaginatedData<ReportDto>> {
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
      this.http.get<PaginatedData<ReportDto>>(`${this.url}${ApiUris.reports}`, {
        params,
      })
    );
  }

  create(dto: CreateReportDto): Promise<ReportDto> {
    return lastValueFrom(
      this.http.post<ReportDto>(`${this.url}${ApiUris.reports}`, dto)
    );
  }

  getById(id: string): Promise<ReportDto> {
    return lastValueFrom(
      this.http.get<ReportDto>(`${this.url}${ApiUris.reports}/${id}`)
    );
  }

  update(data: CreateReportDto, id: string) {
    return lastValueFrom(
      this.http.patch<ReportDto>(`${this.url}${ApiUris.reports}/${id}`, data)
    );
  }

  updateStrategies(data: StrategyDto[], id: string) {
    return lastValueFrom(
      this.http.patch<StrategyDto[]>(
        `${this.url}${ApiUris.reports}/${id}/strategies`,
        data
      )
    );
  }

  updateMeasures(data: MeasureCreateDto[], id: string) {
    return lastValueFrom(
      this.http.patch<MeasureDto[]>(
        `${this.url}${ApiUris.reports}/${id}/measures`,
        data
      )
    );
  }
  updateFinancialImpacts(data: FinancialImpactCreateDto[], id: string) {
    return lastValueFrom(
      this.http.patch<MeasureDto[]>(
        `${this.url}${ApiUris.reports}/${id}/financial-impacts`,
        data
      )
    );
  }

  updateFlags(data: string[], id: string): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
