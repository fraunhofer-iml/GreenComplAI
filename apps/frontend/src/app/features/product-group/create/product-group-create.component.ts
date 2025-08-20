/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductGroupCreateDto,
  ProductGroupDto,
  VariantDto,
} from '@ap2/api-interfaces';
import {
  Component,
  EventEmitter,
  inject,
  input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';

@Component({
  selector: 'app-product-group-create',
  imports: [
    RouterModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './product-group-create.component.html',
})
export class ProductGroupCreateComponent implements OnChanges {
  private readonly productGroupService = inject(ProductGroupService);

  form: FormGroup = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    wasteFlow: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('', Validators.required),
    variants: new FormControl<VariantDto[] | null>([]),
  });

  variants: string[] = [];

  data = input<ProductGroupDto>();

  createMutation = injectMutation(() => ({
    mutationFn: (dto: ProductGroupCreateDto) =>
      this.productGroupService.create(dto),
    onSuccess: async (res) => {
      this.closeSheet(res);
    },
  }));

  updateMutation = injectMutation(() => ({
    mutationFn: (dto: ProductGroupCreateDto) =>
      this.productGroupService.update(dto, this.data()?.id ?? ''),
    onSuccess: async (res) => {
      this.closeSheet(res);
    },
  }));

  @Output() closeSheetEvent = new EventEmitter<ProductGroupDto>();

  ngOnChanges() {
    this.form.patchValue({
      name: this.data()?.name,
      wasteFlow: this.data()?.wasteFlow,
      description: this.data()?.description,
      variants: this.data()?.variants,
    });

    this.variants.push(...(this.data()?.variants ?? []).map((v) => v.name));
  }

  save() {
    if (this.data()) {
      this.updateMutation.mutate(this.form.value as ProductGroupCreateDto);
    } else {
      this.createMutation.mutate(this.form.value as ProductGroupCreateDto);
    }
  }

  private closeSheet(res: ProductGroupDto): void {
    this.resetForm();
    this.closeSheetEvent.emit(res);
  }

  private resetForm() {
    this.form.reset();
    Object.keys(this.form.controls).forEach((key) => {
      this.form.controls[key].setErrors(null);
    });
    this.variants = [];
  }

  addVariant(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) this.variants.push(value);
    event.chipInput.clear();
  }

  removeVariant(variant: string): void {
    this.variants = this.variants.filter((item) => item !== variant);
  }
}
