/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpactType } from '@ap2/api-interfaces';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { Component, input, OnChanges, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { FinancialImpactForm } from '../overview/impact.form';
import {
  addCriticalAssumptionFormGroup,
  removeCriticalAssumptionFormGroup,
} from './criticalAssumptions.form-group';

@Component({
  selector: 'app-update-financial-impact',
  imports: [
    CommonModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatSelectModule,
    MatInputModule,
    TextFieldModule,
  ],
  templateUrl: './update-financial-impact.component.html',
})
export class UpdateFinancialImpactComponent implements OnChanges {
  form = input.required<FinancialImpactForm>();
  isFinal = input.required<boolean>();

  removeEmitter = output<void>();

  ImpactType = ImpactType;

  removeCriticalAssumptionFormGroup = removeCriticalAssumptionFormGroup;
  addCriticalAssumptionFormGroup = addCriticalAssumptionFormGroup;

  ngOnChanges(): void {
    this.form().controls.criticalAssumptions.valueChanges.subscribe(() =>
      this.form().updateValueAndValidity()
    );
  }
}
