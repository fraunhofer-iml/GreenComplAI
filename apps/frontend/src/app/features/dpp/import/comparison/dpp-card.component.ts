/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-dpp-card',
  imports: [CommonModule, MatCheckboxModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dpp-card.component.html',
})
export class ProductDppCompareComponent implements OnChanges {
  title = input<string>('');
  form = input.required<FormControl<boolean | null>>();

  ngOnChanges(changes: SimpleChanges): void {
    this.form().valueChanges.subscribe((val) => console.log(val));
  }

  onChange(event: Event) {
    event.preventDefault();
  }
}
