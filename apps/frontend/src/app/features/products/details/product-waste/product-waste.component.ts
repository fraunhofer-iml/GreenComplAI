/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteDto, WasteMaterialDto } from '@ap2/api-interfaces';
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { FlagableComponent } from '../../../../shared/components/flagable-element/flagable.component';

@Component({
  selector: 'app-product-waste',
  imports: [
    CommonModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlagableComponent,
  ],
  templateUrl: './product-waste.component.html',
})
export class ProductWasteComponent {
  id = input<string>('');
  waste = input<Partial<WasteDto>>();
  flags = input<string[]>([]);
  displayWasteMaterials(materials: WasteMaterialDto[]) {
    return materials
      .map(
        (m) => `${m.material?.name} ( ${m.percentage} % | ${m.weightInKg} kg )`
      )
      .join(', ');
  }
}
