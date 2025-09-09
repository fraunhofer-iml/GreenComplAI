/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteDto, WasteMaterialDto } from '@ap2/api-interfaces';
import { DecimalPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { FlagableComponent } from '../../../../shared/components/flagable-element/flagable.component';

@Component({
  selector: 'app-product-waste',
  imports: [
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlagableComponent,
    DecimalPipe,
    MatChip,
  ],
  providers: [DecimalPipe],
  templateUrl: './product-waste.component.html',
})
export class ProductWasteComponent {
  id = input<string>('');
  waste = input<Partial<WasteDto>>();
  flags = input<string[] | undefined>([]);
  outlier = input<string[]>([]);

  decimalPipe = inject(DecimalPipe);

  displayWasteMaterials(materials: WasteMaterialDto[]) {
    return materials
      .map(
        (m) =>
          `${m.material?.name} ( ${this.decimalPipe.transform(m.percentage, '1.0-2')} % | ${this.decimalPipe.transform(m.weightInKg, '1.0-2')} kg )`
      )
      .join(', ');
  }
}
