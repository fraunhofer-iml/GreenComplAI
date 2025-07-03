/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { InFlowAnalysisDto, WasteFlowAnalysisDto } from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  url = environment.baseUrl;

  constructor(private readonly http: HttpClient) {}

  getWasteFlowAnalysisOfProductGroups(
    fromYear: number,
    toYear: number,
    productGroupId?: string
  ) {
    let params = new HttpParams();
    params = params.set('fromYear', fromYear.toString());
    params = params.set('toYear', toYear.toString());
    if (productGroupId) {
      params = params.set('productGroupId', productGroupId);
    }
    return lastValueFrom(
      this.http.get<WasteFlowAnalysisDto>(`${this.url}${ApiUris.wasteFlow}`, {
        params,
      })
    );
  }

  getInFlowAnalysisOfProductGroups(
    fromYear: number,
    toYear: number,
    productGroupId?: string
  ) {
    let params = new HttpParams();
    params = params.set('fromYear', fromYear.toString());
    params = params.set('toYear', toYear.toString());
    if (productGroupId) {
      params = params.set('productGroupId', productGroupId);
    }
    return lastValueFrom(
      this.http.get<InFlowAnalysisDto>(`${this.url}${ApiUris.inFlow}`, {
        params,
      })
    );
  }
}
