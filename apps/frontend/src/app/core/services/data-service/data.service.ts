/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';

@Injectable()
export abstract class DataService<T> {
  abstract getById(id: unknown): Promise<unknown>;
  abstract updateFlags(data: string[], id: string): Promise<unknown>;
  abstract create(dto: any): Promise<any>;
  abstract fetchData(
    page: number,
    pageSize: number,
    filters: string,
    sorting: string,
    additional?: Map<string, string>
  ): Promise<T>;
}
