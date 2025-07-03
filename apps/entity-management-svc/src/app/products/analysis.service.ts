/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AnalysisDto,
  GenerateAnalysisProp,
  PackagingDto,
  ProductDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import {
  getTotalWeightOfHazardousWaste,
  getTotalWeightOfWaste,
} from '../utils/weight.utils';
import { ProductService } from './products.service';
import { productionHistoryAggregationQuery } from './queries/production-history-aggregation.query';

@Injectable()
export class ProductAnalysisService {
  constructor(
    private readonly productService: ProductService,
    private readonly prismaService: PrismaService
  ) {}

  public async getAnalysis(
    createAnalysisDto: GenerateAnalysisProp
  ): Promise<AnalysisDto> {
    const product: ProductDto = await this.productService.findOne({
      id: createAnalysisDto.productId,
    });

    const preliminaryProducts: [ProductDto, number][] =
      await this.productService.findPreliminaryProducts({
        id: createAnalysisDto.productId,
      });

    const packagingOfProduct: [PackagingDto, number][] = product.packagings;
    const weightOfProduct: number = product.weight;
    const weightOfPackaging: number =
      this.getWeightOfPackaging(packagingOfProduct);
    const weightOfProductWaste: number =
      product.waste == null ? 0 : getTotalWeightOfWaste(product.waste);
    const weightOfMaterial: number =
      product.weight + weightOfPackaging + weightOfProductWaste;
    const percentageOfBiologicalMaterialsOfProduct: number =
      product.percentageOfBiologicalMaterials;
    const weightOfRenewableMaterialOfProduct: number =
      product.weight * (product.percentageOfBiologicalMaterials / 100);
    const renewablePackagingWeight: number =
      this.getWeightOfRenewableMaterialOfPackaging(packagingOfProduct);
    const percentageOfRenewablePackaging: number =
      renewablePackagingWeight == 0
        ? 0
        : (renewablePackagingWeight * 100) / weightOfPackaging;
    const amountOfRecycledPreProduct: number =
      await this.getWeightOfRecycledWasteOfPreProducts(
        product,
        preliminaryProducts
      );
    const amountOfRecycledMaterialOfPackaging: number =
      this.getWeightOfRecycledMaterialOfPackaging(packagingOfProduct);
    const amountOfDangerousWaste: number =
      product.waste == null ? 0 : getTotalWeightOfHazardousWaste(product.waste);
    const amountOfRadioactiveWaste: number =
      product.waste === null ? 0 : product.waste.radioactiveAmount;

    const water = await this.getWaterConsumption(
      product,
      preliminaryProducts,
      createAnalysisDto.userId
    );

    return {
      totalWeightOfProduct: weightOfProduct * createAnalysisDto.amount,
      totalWeightOfMaterial: weightOfMaterial * createAnalysisDto.amount,
      percentageOfBiologicalMaterialsOfProduct:
        percentageOfBiologicalMaterialsOfProduct,
      amountOfRenewableMaterialOfProduct:
        weightOfRenewableMaterialOfProduct * createAnalysisDto.amount,
      percentageOfRenewableMaterialOfPackaging: percentageOfRenewablePackaging,
      amountOfRenewableMaterialOfPackaging:
        renewablePackagingWeight * createAnalysisDto.amount,
      amountOfRecycledPreProductOfProduct:
        amountOfRecycledPreProduct * createAnalysisDto.amount,
      amountOfRecycledMaterialOfPackaging:
        amountOfRecycledMaterialOfPackaging * createAnalysisDto.amount,
      amountOfDangerousWaste: amountOfDangerousWaste * createAnalysisDto.amount,
      amountOfRadioactiveWaste:
        amountOfRadioactiveWaste * createAnalysisDto.amount,
      productionWaterConsumption:
        water.productionWater * createAnalysisDto.amount,
      upstreamWaterConsumption: water.upstreamWater * createAnalysisDto.amount,
    } as AnalysisDto;
  }

  private async getWeightOfRecycledWasteOfPreProducts(
    product: ProductDto,
    preliminaryProducts: [ProductDto, number][]
  ): Promise<number> {
    let weightOfRecycledWaste = 0;

    for (const preliminaryProductDto of preliminaryProducts) {
      weightOfRecycledWaste +=
        this.getWeightOfRecycledWaste(preliminaryProductDto[0]) *
        preliminaryProductDto[1];
    }
    return weightOfRecycledWaste;
  }

  private getWeightOfRecycledWaste(product: ProductDto): number {
    return product.waste == null
      ? 0
      : getTotalWeightOfWaste(product.waste) *
          (product.waste.recycledWastePercentage / 100);
  }

  private getWeightOfPackaging(
    packagingOfProduct: [PackagingDto, number][]
  ): number {
    let weightOfPackaging = 0;
    packagingOfProduct.forEach(([packaging, amount]): void => {
      weightOfPackaging += packaging.weight * amount;
    });
    return weightOfPackaging;
  }

  private getWeightOfRenewableMaterialOfPackaging(
    packagingOfProduct: [PackagingDto, number][]
  ): number {
    let weightOfRenewableMaterial = 0;
    packagingOfProduct.forEach(([packaging, amount]): void => {
      weightOfRenewableMaterial +=
        packaging.weight *
        (packaging.percentageOfRenewableMaterial / 100) *
        amount;
    });
    return weightOfRenewableMaterial;
  }

  private getWeightOfRecycledMaterialOfPackaging(
    packagingOfProduct: [PackagingDto, number][]
  ): number {
    let weightOfRecycledMaterial = 0;
    packagingOfProduct.forEach(([packaging, amount]): void => {
      weightOfRecycledMaterial +=
        packaging.weight *
        (packaging.percentageOfRecycledMaterial / 100) *
        amount;
    });
    return weightOfRecycledMaterial;
  }

  async getWaterConsumption(
    product: ProductDto,
    preliminaryProducts: [ProductDto, number][],
    userId: string
  ): Promise<{ upstreamWater: number; productionWater: number }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    let productionWater = 0;

    let preliminaryWater = preliminaryProducts.reduce(
      (acc, curr: [ProductDto, number]) =>
        acc + (curr[0].waterUsed ?? 0) * curr[1],
      0
    );

    if (product.manufacturer.id === user.companyId)
      productionWater = product.waterUsed ?? 0;
    else preliminaryWater += product.waterUsed ?? 0;

    return {
      upstreamWater: preliminaryWater,
      productionWater: productionWater,
    };
  }

  async getMultiplierForProducts(
    productIds: string[],
    from: number,
    to: number
  ): Promise<Map<string, number>> {
    const aggregation = await this.prismaService.productionHistory.groupBy(
      productionHistoryAggregationQuery(productIds, from, to)
    );
    return new Map(aggregation.map((a) => [a.productId, a._sum.amount]));
  }
}
