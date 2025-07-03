/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDto } from '@ap2/api-interfaces';
import { FormControl, Validators } from '@angular/forms';

export const productFormControl = (
  item: ProductDto
): {
  product: ProductDto;
  amount: FormControl<number>;
  selected: FormControl<boolean>;
} => {
  return {
    product: item,
    amount: new FormControl<number>(1, {
      nonNullable: true,
      validators: Validators.required,
    }),
    selected: new FormControl(false, {
      nonNullable: true,
      validators: Validators.required,
    }),
  };
};
