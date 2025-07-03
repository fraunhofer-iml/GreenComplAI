/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalysisQuery } from '@ap2/amqp';
import {
  GenericInFlowAnalysisDto,
  InFlowAnalysisDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { aggregateItemsWithAmount } from '@ap2/util';
import { Injectable } from '@nestjs/common';
import { ProductAnalysisService } from '../products/analysis.service';
import { GetProductsForAnalysisType } from './prisma-product-analysis.type';
import { findProductsByGroupIdQuery } from './queries/find-product-group-by-id.query';
import { findProductGroupsQuery } from './queries/find-product-groups.query';

@Injectable()
export class InFlowAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisServive: ProductAnalysisService
  ) {}

  getInFlowAnalysis({
    fromYear,
    toYear,
    productGroupId,
  }: AnalysisQuery): Promise<InFlowAnalysisDto> {
    if (productGroupId) {
      return this.getInFlowAnalysisOfProductGroupById(
        productGroupId,
        fromYear,
        toYear
      );
    }

    return this.getInFlowAnalysisForProductGroups(fromYear, toYear);
  }

  async getInFlowAnalysisForProductGroups(
    fromYear: number,
    toYear: number
  ): Promise<InFlowAnalysisDto> {
    const productGroups = await this.prisma.productGroup.findMany(
      findProductGroupsQuery()
    );

    const analysisOfProductGroups: GenericInFlowAnalysisDto[] = [];

    const multiplier = await this.analysisServive.getMultiplierForProducts(
      productGroups.flatMap((g) => g.products.map((p) => p.id)),
      fromYear,
      toYear
    );

    for (const group of productGroups) {
      const analysisOfProducts: GenericInFlowAnalysisDto[] = [];
      for (const product of group.products) {
        const productAnalysis = await this.getAnalysisForProduct(
          product,
          multiplier.get(product.id)
        );
        analysisOfProducts.push(productAnalysis);
      }

      const analysisOfProductGroup = new InFlowAnalysisDto(analysisOfProducts);

      analysisOfProductGroups.push({
        id: group.id,
        name: group.name,
        amount: analysisOfProductGroup.amount,
        materials: analysisOfProductGroup.materials,
        packagings: analysisOfProductGroup.packagings,
        criticalMaterials: analysisOfProductGroup.criticalMaterials,
        rareEarths: analysisOfProductGroup.rareEarths,
        water: analysisOfProductGroup.water,
      } as GenericInFlowAnalysisDto);
    }

    return new InFlowAnalysisDto(analysisOfProductGroups);
  }

  async getInFlowAnalysisOfProductGroupById(
    productGroupId: string,
    fromYear: number,
    toYear: number
  ): Promise<InFlowAnalysisDto> {
    const products = await this.prisma.product.findMany(
      findProductsByGroupIdQuery(productGroupId)
    );

    const multiplier = await this.analysisServive.getMultiplierForProducts(
      products.map((p) => p.id),
      fromYear,
      toYear
    );

    const analysis: GenericInFlowAnalysisDto[] = [];
    for (const product of products) {
      const productAnalysis = await this.getAnalysisForProduct(
        product,
        multiplier.get(product.id)
      );
      analysis.push(productAnalysis);
    }

    return new InFlowAnalysisDto(analysis);
  }

  private async getAnalysisForProduct(
    product: GetProductsForAnalysisType,
    multiplier: number
  ): Promise<GenericInFlowAnalysisDto> {
    if (!multiplier) {
      const productAnalysis = {
        id: product.id,
        name: product.name,
        amount: 0,
        materials: [],
        criticalMaterials: [],
        rareEarths: [],
        packagings: [],
        water: 0,
      } as GenericInFlowAnalysisDto;

      return productAnalysis;
    }

    const materials: [string, number][] = product.billOfMaterial.flatMap(
      (product) =>
        product.preliminaryProduct.materials.map(
          (m) =>
            [
              m.material.name,
              m.percentage * product.preliminaryProduct.weight * multiplier,
            ] as [string, number]
        )
    );

    const criticalMaterials: [string, number][] =
      product.billOfMaterial.flatMap((product) =>
        product.preliminaryProduct.criticalRawMaterials.map(
          (m) =>
            [
              m.material.name,
              m.percentage * product.preliminaryProduct.weight * multiplier,
            ] as [string, number]
        )
      );

    const rareEarths: [string, number][] = product.billOfMaterial.flatMap(
      (product) =>
        product.preliminaryProduct.rareEarths.map(
          (m) =>
            [
              m.material.name,
              m.percentage * product.preliminaryProduct.weight * multiplier,
            ] as [string, number]
        )
    );

    const water = product.billOfMaterial.reduce(
      (acc: number, curr) =>
        acc + curr.preliminaryProduct.waterUsed * multiplier,
      0
    );

    const amount = product.billOfMaterial.reduce(
      (acc, curr) => acc + curr.amount * multiplier,
      0
    );

    const packagings: [string, number][] = product.billOfMaterial
      .flatMap((pr) => pr.preliminaryProduct.packagings)
      .flatMap((packaging) => {
        const partPackagings: [string, number][] =
          packaging.packaging.partPackagings.map((partPack) => [
            partPack.packaging.id,
            partPack.amount * multiplier,
          ]);

        return [
          ...partPackagings,
          [packaging.packaging.id, packaging.amount * multiplier],
        ];
      });

    return {
      id: product.id,
      name: product.name,
      amount: amount * multiplier,
      materials: aggregateItemsWithAmount(materials),
      criticalMaterials: aggregateItemsWithAmount(criticalMaterials),
      rareEarths: aggregateItemsWithAmount(rareEarths),
      packagings: aggregateItemsWithAmount(packagings),
      water: water * multiplier,
    };
  }
}
