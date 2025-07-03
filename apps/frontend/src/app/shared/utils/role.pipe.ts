/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'role',
  standalone: true,
})
export class RolePipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case AuthRoles.BUYER:
        return 'Einkäufer';
      case AuthRoles.SUSTAINABILITY_MANAGER:
        return 'Nachhaltigkeitsmanager';
      case AuthRoles.CHIEF_EXECUTIVE_OFFICER:
        return 'Geschäftsführer';
      case AuthRoles.SUPPLIER:
        return 'Lieferant';
      case AuthRoles.PRODUCTION_MANAGER:
        return 'Produktionsleiter';
      case AuthRoles.DISPOSAL_LOGISTICS_SPECISALIST:
        return 'Entsorgungslogistiker';
      case AuthRoles.PACKAGING_LOGISTICS_SPECISALIST:
        return 'Verpackungslogistiker';
      default:
        return '';
    }
  }
}
