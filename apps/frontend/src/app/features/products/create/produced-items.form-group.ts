/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ProducedItemsFormGroup } from './model/product-form.model';

export const producedItemsFormGroup = () =>
  new FormGroup<ProducedItemsFormGroup>({
    producedItems: new FormArray([
      new FormGroup({
        amount: new FormControl<number | null>(null),
        year: new FormControl<Date | null>(null),
      }),
    ]),
  });

export const addProducedItems = (form: FormGroup<ProducedItemsFormGroup>) => {
  form.controls.producedItems.push(
    new FormGroup({
      amount: new FormControl<number | null>(null),
      year: new FormControl<Date | null>(null),
    })
  );
};

export const removeProducedItemFormGroup = (
  form: FormGroup<ProducedItemsFormGroup>,
  index: number
) => {
  form.controls.producedItems.removeAt(index);
};
