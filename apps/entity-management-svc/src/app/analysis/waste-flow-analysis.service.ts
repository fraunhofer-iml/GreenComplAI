/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenericWasteFlowAnalysisDto,
  WasteFlowAnalysisDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable } from '@nestjs/common';
import { ProductAnalysisService } from '../products/analysis.service';
import { getNormalAndHazardousWaste } from '../utils/waste-queries';
import {
  getTotalWasteWeightNotRecyclable,
  getTotalWeightOfWaste,
} from '../utils/weight.utils';

@Injectable()
export class WasteFlowAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: ProductAnalysisService
  ) {}

  getWasteFlowAnalysis({
    fromYear,
    toYear,
    productGroupId,
    filter,
  }: {
    fromYear: number;
    toYear: number;
    filter: string;
    productGroupId?: string;
  }) {
    if (productGroupId) {
      return this.getWasteFlowAnalysisOfProductGroupById({
        productGroupId,
        fromYear,
        toYear,
        filter,
      });
    }

    return this.getWasteFlowAnalysisForProductGroups({
      fromYear,
      toYear,
      filter,
    });
  }

  async getWasteFlowAnalysisForProductGroups({
    fromYear,
    toYear,
    filter,
  }: {
    fromYear: number;
    toYear: number;
    filter: string;
  }): Promise<WasteFlowAnalysisDto> {
    const productGroups = await this.prisma.productGroup.findMany({
      where: { name: { contains: filter } },
      include: {
        products: {
          include: {
            productionHistory: true,
            waste: {
              include: getNormalAndHazardousWaste(),
            },
          },
        },
      },
    });

    const multiplier = await this.analysisService.getMultiplierForProducts(
      productGroups.flatMap((g) => g.products.map((p) => p.id)),
      fromYear,
      toYear
    );
    const analysis: GenericWasteFlowAnalysisDto[] = productGroups.map(
      (productGroup) => {
        return {
          id: productGroup.id,
          name: productGroup.name,
          producedItems: productGroup.products.reduce((acc, product) => {
            return acc + (multiplier.get(product.id) ?? 0);
          }, 0),
          wasteWeight: productGroup.products.reduce((acc, product) => {
            if (!product.waste) return acc;

            return (
              acc +
              getTotalWeightOfWaste(product.waste) *
                (multiplier.get(product.id) ?? 0)
            );
          }, 0),
          normalWaste: {
            nonUtilizableWaste: {
              landfillWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return undefined;
                return (
                  acc +
                  product.waste.normalWaste.nonUtilizableWaste.landfillWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
              combustionWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return acc;
                return (
                  acc +
                  product.waste.normalWaste.nonUtilizableWaste
                    .combustionWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
              miscellaneousWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return undefined;
                  return (
                    acc +
                    product.waste.normalWaste.nonUtilizableWaste
                      .miscellaneousWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
            },
            utilizableWaste: {
              preparationForRecyclingWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return acc;
                  return (
                    acc +
                    product.waste.normalWaste.utilizableWaste
                      .preparationForRecyclingWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
              miscellaneousWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return acc;
                  return (
                    acc +
                    product.waste.normalWaste.utilizableWaste
                      .miscellaneousWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
              recyclingWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return acc;
                return (
                  acc +
                  product.waste.normalWaste.utilizableWaste.recyclingWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
            },
          },
          hazardousWaste: {
            nonUtilizableWaste: {
              landfillWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return acc;

                return (
                  acc +
                  product.waste.hazardousWaste.nonUtilizableWaste
                    .landfillWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
              combustionWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return acc;

                return (
                  acc +
                  product.waste.hazardousWaste.nonUtilizableWaste
                    .combustionWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
              miscellaneousWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return acc;

                  return (
                    acc +
                    product.waste.hazardousWaste.nonUtilizableWaste
                      .miscellaneousWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
            },
            utilizableWaste: {
              preparationForRecyclingWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return acc;

                  return (
                    acc +
                    product.waste.hazardousWaste.utilizableWaste
                      .preparationForRecyclingWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
              miscellaneousWeight: productGroup.products.reduce(
                (acc, product) => {
                  if (!product.waste) return acc;

                  return (
                    acc +
                    product.waste.hazardousWaste.utilizableWaste
                      .miscellaneousWeight *
                      (multiplier.get(product.id) ?? 0)
                  );
                },
                0
              ),
              recyclingWeight: productGroup.products.reduce((acc, product) => {
                if (!product.waste) return acc;

                return (
                  acc +
                  product.waste.hazardousWaste.utilizableWaste.recyclingWeight *
                    (multiplier.get(product.id) ?? 0)
                );
              }, 0),
              wasteWeightNotRecyclable: 0,
              wasteWeightNotRecyclablePercentage: 0,
            },
          },
          wasteWeightNotRecyclable: productGroup.products.reduce(
            (acc, product) => {
              if (!product.waste) return acc;
              return (
                acc +
                getTotalWasteWeightNotRecyclable(product.waste) *
                  (multiplier.get(product.id) ?? 0)
              );
            },
            0
          ),
          wasteWeightNotRecyclablePercentage:
            productGroup.products.reduce((acc, product) => {
              if (!product.waste) return acc;
              return (
                acc +
                getTotalWasteWeightNotRecyclable(product.waste) *
                  (multiplier.get(product.id) ?? 0)
              );
            }, 0) /
            productGroup.products.reduce((acc, product) => {
              if (!product.waste) return acc;
              return (
                acc +
                getTotalWeightOfWaste(product.waste) *
                  (multiplier.get(product.id) ?? 0)
              );
            }, 0),
        };
      }
    );

    return {
      analysis,
      totalWeight: analysis.reduce((acc, productGroup) => {
        return acc + productGroup.wasteWeight;
      }, 0),
      totalProducedItems: analysis.reduce(
        (acc, productGroup) => acc + productGroup.producedItems,
        0
      ),
      normalNonUtilizableWasteWeight: analysis.reduce(
        (acc, productGroup) =>
          acc +
          productGroup.normalWaste.nonUtilizableWaste.landfillWeight +
          productGroup.normalWaste.nonUtilizableWaste.combustionWeight +
          productGroup.normalWaste.nonUtilizableWaste.miscellaneousWeight,
        0
      ),
      normalUtilizableWasteWeight: analysis.reduce(
        (acc, productGroup) =>
          acc +
          productGroup.normalWaste.utilizableWaste
            .preparationForRecyclingWeight +
          productGroup.normalWaste.utilizableWaste.recyclingWeight +
          productGroup.normalWaste.utilizableWaste.miscellaneousWeight,
        0
      ),
      hazardousNonUtilizableWasteWeight: analysis.reduce(
        (acc, productGroup) =>
          acc +
          productGroup.hazardousWaste.nonUtilizableWaste.landfillWeight +
          productGroup.hazardousWaste.nonUtilizableWaste.combustionWeight +
          productGroup.hazardousWaste.nonUtilizableWaste.miscellaneousWeight,
        0
      ),
      hazardousUtilizableWasteWeight: analysis.reduce(
        (acc, productGroup) =>
          acc +
          productGroup.hazardousWaste.utilizableWaste
            .preparationForRecyclingWeight +
          productGroup.hazardousWaste.utilizableWaste.recyclingWeight +
          productGroup.hazardousWaste.utilizableWaste.miscellaneousWeight,
        0
      ),
      totalWasteWeightNotRecyclable: analysis.reduce((acc, productGroup) => {
        return acc + productGroup.wasteWeightNotRecyclable;
      }, 0),
      totalWasteWeightNotRecyclablePercentage:
        analysis.reduce((acc, productGroup) => {
          return acc + productGroup.wasteWeightNotRecyclable;
        }, 0) /
        analysis.reduce((acc, productGroup) => {
          return acc + productGroup.wasteWeight;
        }, 0),
    };
  }

  async getWasteFlowAnalysisOfProductGroupById({
    productGroupId,
    fromYear,
    toYear,
    filter,
  }: {
    productGroupId: string;
    fromYear: number;
    toYear: number;
    filter: string;
  }): Promise<WasteFlowAnalysisDto> {
    const productGroup = await this.prisma.productGroup.findUnique({
      where: { id: productGroupId },
      include: {
        products: {
          where: { name: { contains: filter } },
          include: {
            productionHistory: true,
            waste: {
              include: getNormalAndHazardousWaste(),
            },
          },
        },
      },
    });

    console.log(productGroup);

    const multiplier = await this.analysisService.getMultiplierForProducts(
      productGroup.products.map((p) => p.id),
      fromYear,
      toYear
    );

    const analysis: GenericWasteFlowAnalysisDto[] = productGroup.products.map(
      (product) => {
        return {
          id: product.id,
          name: product.name,
          producedItems: multiplier.get(product.id),
          wasteWeight:
            getTotalWeightOfWaste(product.waste) *
            (multiplier.get(product.id) ?? 0),
          normalWaste: {
            nonUtilizableWaste: {
              landfillWeight:
                product.waste.normalWaste.nonUtilizableWaste.landfillWeight *
                (multiplier.get(product.id) ?? 0),
              combustionWeight:
                product.waste.normalWaste.nonUtilizableWaste.combustionWeight *
                (multiplier.get(product.id) ?? 0),
              miscellaneousWeight:
                product.waste.normalWaste.nonUtilizableWaste
                  .miscellaneousWeight * (multiplier.get(product.id) ?? 0),
            },
            utilizableWaste: {
              preparationForRecyclingWeight:
                product.waste.normalWaste.utilizableWaste
                  .preparationForRecyclingWeight *
                (multiplier.get(product.id) ?? 0),
              miscellaneousWeight:
                product.waste.normalWaste.utilizableWaste.miscellaneousWeight *
                (multiplier.get(product.id) ?? 0),
              recyclingWeight:
                product.waste.normalWaste.utilizableWaste.recyclingWeight *
                (multiplier.get(product.id) ?? 0),
            },
          },
          hazardousWaste: {
            nonUtilizableWaste: {
              landfillWeight:
                product.waste.hazardousWaste.nonUtilizableWaste.landfillWeight *
                (multiplier.get(product.id) ?? 0),
              combustionWeight:
                product.waste.hazardousWaste.nonUtilizableWaste
                  .combustionWeight * (multiplier.get(product.id) ?? 0),
              miscellaneousWeight:
                product.waste.hazardousWaste.nonUtilizableWaste
                  .miscellaneousWeight * (multiplier.get(product.id) ?? 0),
            },
            utilizableWaste: {
              preparationForRecyclingWeight:
                product.waste.hazardousWaste.utilizableWaste
                  .preparationForRecyclingWeight *
                (multiplier.get(product.id) ?? 0),
              miscellaneousWeight:
                product.waste.hazardousWaste.utilizableWaste
                  .miscellaneousWeight * (multiplier.get(product.id) ?? 0),
              recyclingWeight:
                product.waste.hazardousWaste.utilizableWaste.recyclingWeight *
                (multiplier.get(product.id) ?? 0),
            },
          },
          wasteWeightNotRecyclable:
            getTotalWasteWeightNotRecyclable(product.waste) *
            (multiplier.get(product.id) ?? 0),
          wasteWeightNotRecyclablePercentage:
            (getTotalWasteWeightNotRecyclable(product.waste) *
              (multiplier.get(product.id) ?? 0)) /
            (getTotalWeightOfWaste(product.waste) *
              (multiplier.get(product.id) ?? 0)),
        };
      }
    );

    return {
      analysis,
      totalWeight: analysis.reduce((acc, product) => {
        return acc + product.wasteWeight;
      }, 0),
      totalProducedItems: analysis.reduce(
        (acc, product) => acc + product.producedItems,
        0
      ),
      normalNonUtilizableWasteWeight: analysis.reduce(
        (acc, product) =>
          acc +
          product.normalWaste.nonUtilizableWaste.landfillWeight +
          product.normalWaste.nonUtilizableWaste.combustionWeight +
          product.normalWaste.nonUtilizableWaste.miscellaneousWeight,
        0
      ),
      normalUtilizableWasteWeight: analysis.reduce(
        (acc, product) =>
          acc +
          product.normalWaste.utilizableWaste.preparationForRecyclingWeight +
          product.normalWaste.utilizableWaste.recyclingWeight +
          product.normalWaste.utilizableWaste.miscellaneousWeight,
        0
      ),
      hazardousNonUtilizableWasteWeight: analysis.reduce(
        (acc, product) =>
          acc +
          product.hazardousWaste.nonUtilizableWaste.landfillWeight +
          product.hazardousWaste.nonUtilizableWaste.combustionWeight +
          product.hazardousWaste.nonUtilizableWaste.miscellaneousWeight,
        0
      ),
      hazardousUtilizableWasteWeight: analysis.reduce(
        (acc, product) =>
          acc +
          product.hazardousWaste.utilizableWaste.preparationForRecyclingWeight +
          product.hazardousWaste.utilizableWaste.recyclingWeight +
          product.hazardousWaste.utilizableWaste.miscellaneousWeight,
        0
      ),
      totalWasteWeightNotRecyclable: analysis.reduce((acc, product) => {
        return acc + product.wasteWeightNotRecyclable;
      }, 0),
      totalWasteWeightNotRecyclablePercentage:
        analysis.reduce((acc, product) => {
          return acc + product.wasteWeightNotRecyclable;
        }, 0) /
        analysis.reduce((acc, product) => {
          return acc + product.wasteWeight;
        }, 0),
    };
  }
}
