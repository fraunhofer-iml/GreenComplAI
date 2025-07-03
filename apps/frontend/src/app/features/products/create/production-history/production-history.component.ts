/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { BaseSheetComponent } from '../../../../shared/components/sheet/base/sheet.component';
import { ProducedItemsFormGroup } from '../model/product-form.model';
import {
  addProducedItems,
  removeProducedItemFormGroup,
} from '../produced-items.form-group';
import { SelectProducedPerYearComponent } from '../select-produced-per-year.sheet/select-produced-per-year.component';

@Component({
  selector: 'app-production-history',
  imports: [
    CommonModule,
    MatChipsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    BaseSheetComponent,
    SelectProducedPerYearComponent,
    MatIconModule,
  ],
  templateUrl: './production-history.component.html',
})
export class ProductionHistoryComponent {
  producedItemsForm = input.required<FormGroup<ProducedItemsFormGroup>>();

  addProducedItems = addProducedItems;
  removeProducedItemFormGroup = removeProducedItemFormGroup;
}
