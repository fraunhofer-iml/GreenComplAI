/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, inject, input, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService } from '../../../core/services/data-service/data.service';

@Component({
  selector: 'app-flagable',
  imports: [MatTooltipModule],
  templateUrl: './flagable.component.html',
})
export class FlagableComponent<T> {
  private readonly dataService = inject(DataService<T>);

  @Input() data: string[] = [];
  @Input() element = '';
  @Input() topic = '';
  @Input({ required: true }) id = '';
  flag: any = '';
  alt: any = 'Element is not flagged';

  outlier = input<string[]>();

  async toggleFlag() {
    this.data = await this.dataService
      .updateFlags([this.element], this.id)
      .then((data: any) => data.flags);
  }
}
