/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input, Input } from '@angular/core';
import { DataService } from '../../../core/services/data-service/data.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-flagable',
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './flagable.component.html',
})
export class FlagableComponent<T> {
  @Input() data: string[] = [];
  @Input() element = '';
  @Input() topic = '';
  @Input({ required: true }) id = '';
  flag: any = '';
  alt: any = 'Element is not flagged';

  outlier = input<string[]>();

  constructor(private readonly dataService: DataService<T>) {}

  async toggleFlag() {
    this.data = await this.dataService
      .updateFlags([this.element], this.id)
      .then((data: any) => data.flags);
  }
}
