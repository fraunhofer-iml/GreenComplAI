/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from "@angular/material/checkbox";

@Component({
  selector: 'app-dpp-card',
  imports: [CommonModule, MatCheckboxModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dpp-card.component.html',
})
export class ProductDppCompareComponent {
  title = input<string>('');
 formControl = input.required<FormControl<boolean | null>>()

}
