/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  Submodel,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { ProductDto } from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';

@Injectable()
export class DppService {
  private readonly http = inject(HttpClient);
  url = environment.baseUrl;

  createDpp(productId: string): Promise<void> {
    return lastValueFrom(
      this.http.post<void>(`${this.url}${ApiUris.dpp}`, { productId })
    );
  }

  getDpp(
    aasIdentifier: string
  ): Promise<AssetAdministrationShell & { connectedSubmodels: Submodel[] }> {
    return lastValueFrom(
      this.http.get<
        AssetAdministrationShell & { connectedSubmodels: Submodel[] }
      >(`${this.url}${ApiUris.dpp}/${aasIdentifier}`)
    );
  }

  importProductFromDpp(aasIdentifier: string) {
    return lastValueFrom(
      this.http.get<ProductDto>(
        `${this.url}${ApiUris.dpp}/${aasIdentifier}/product`
      )
    );
  }
}
