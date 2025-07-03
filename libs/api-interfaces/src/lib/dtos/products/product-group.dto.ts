/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WasteMaterialEvaluationDto } from '../waste';
import { ProductDto } from './product.dto';
import { VariantDto } from './variant.dto';

export class ProductGroupDto {
  id: string;
  name: string;
  description: string;
  variants?: VariantDto[];
  products?: ProductDto[];
  amount?: number;
  wasteFlow?: string;
  wasteMaterialEvaluation?: WasteMaterialEvaluationDto[];
  flags: string[];

  constructor(
    id: string,
    name: string,
    description: string,
    flags: string[],
    variants?: VariantDto[],
    products?: ProductDto[],
    amount?: number,
    wasteFlow?: string,
    wasteMaterialEvaluation?: WasteMaterialEvaluationDto[]
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.variants = variants;
    this.products = products;
    this.amount = amount;
    this.wasteFlow = wasteFlow;
    this.wasteMaterialEvaluation = wasteMaterialEvaluation;
    this.flags = flags;
  }

  public static createEmpty(): ProductGroupDto {
    return new ProductGroupDto('', '', '', [], [], [], 0, '', []);
  }
}
