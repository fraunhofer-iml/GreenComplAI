/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MappingDto } from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiUris } from '../../../shared/constants/uris';

@Injectable()
export class MappingsService {
  private readonly http = inject(HttpClient);

  url = environment.baseUrl;

  getMappings(id: string) {
    return lastValueFrom(
      this.http.get<MappingDto>(`${this.url}${ApiUris.mapping}/${id}`)
    );
  }

  createMapping(mapping: MappingDto) {
    return lastValueFrom(
      this.http.post(`${this.url}${ApiUris.mapping}`, mapping)
    );
  }
}
