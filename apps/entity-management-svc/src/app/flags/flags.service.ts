/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

interface elementType {
  flags: string[];
}
@Injectable()
export class FlagsService {
  evaluateFlag<T extends elementType, D>(
    evaluationElement: T,
    element: D,
    existingFlags?: string[]
  ): string[] {
    const flags: string[] = existingFlags ?? [];
    Object.keys(element).forEach((el) => {
      if (
        el != 'id' &&
        el != 'flags' &&
        (!evaluationElement[el] ||
          evaluationElement[el] === null ||
          evaluationElement[el].length <= 0)
      ) {
        flags.push(el);
      }
    });
    return flags;
  }
}
