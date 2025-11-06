/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FindProductByIdProps,
  PackagingEntity,
  ProductCreateDto,
  ProductEntity,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable, Logger } from '@nestjs/common';
import { FlagsService } from '../flags/flags.service';
import { productCreateQuery } from './queries/product-create.query';
import { productFindUniqueQuery } from './queries/product-find-unique.query';
import {
  historyUpdateQuery,
  packagingConnectionUpdateQuery,
  preliminaryConnectionUpdateQuery,
  productWasteUpdateQuery,
} from './queries/product-update.query';

@Injectable()
export class ProductRelationsService {
  private readonly logger: Logger = new Logger(ProductRelationsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly flagService: FlagsService
  ) {}

  async findPreliminaryProducts({
    id,
  }: FindProductByIdProps): Promise<[ProductEntity, number][]> {
    const products =
      await this.prismaService.productPreliminaryProduct.findMany({
        where: { productId: id?.toString() },
        include: {
          preliminaryProduct: {
            include: {
              productionHistory: {
                select: {
                  amount: true,
                  year: true,
                },
              },
              manufacturer: {
                include: {
                  addresses: true,
                },
              },
              materials: {
                include: {
                  material: true,
                },
              },
              supplier: { include: { addresses: true } },
              waste: {
                include: {
                  wasteMaterials: { include: { material: true } },
                  normalWaste: {
                    include: {
                      nonUtilizableWaste: true,
                      utilizableWaste: true,
                    },
                  },
                  hazardousWaste: {
                    include: {
                      nonUtilizableWaste: true,
                      utilizableWaste: true,
                    },
                  },
                },
              },
              productGroup: { include: { variants: true } },
              warehouseLocation: true,
              productionLocation: true,
              wasteFlow: true,
              rareEarths: { include: { material: true } },
              criticalRawMaterials: { include: { material: true } },
            },
          },
        },
      });

    return products.map((p) => [p.preliminaryProduct, p.amount] as const);
  }

  async findProductPackaging({
    id,
  }: FindProductByIdProps): Promise<[PackagingEntity, number][]> {
    const packagings = await this.prismaService.productPackaging.findMany({
      where: { productId: id },
      include: {
        packaging: {
          include: {
            products: { include: { product: true } },
            supplier: { include: { addresses: true } },
            waste: {
              include: {
                hazardousWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                normalWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                wasteMaterials: { include: { material: true } },
              },
            },
            materials: { include: { material: true } },
          },
        },
      },
    });

    return packagings.map((p) => [p.packaging, p.amount] as const);
  }

  async updatePackaging({
    id,
    dto,
  }: UpdateProductDependenciesProps): Promise<ProductEntity> {
    await this.prismaService.productPackaging.deleteMany({
      where: {
        productId: id,
        packagingId: {
          notIn: dto.map.map((dto) => dto[0] ?? ''),
        },
      },
    });

    await this.prismaService.product.update(
      packagingConnectionUpdateQuery(dto.map, id)
    );

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async updateFlags({
    id,
    dto,
  }: UpdateFlagProductProps): Promise<ProductEntity | null> {
    const product = await this.prismaService.product.findUnique({
      where: { id: id },
      select: { flags: true },
    });
    if (!product) return null;
    for (const flag of dto.flags) {
      product.flags = product.flags.includes(flag)
        ? product.flags.filter((f) => f !== flag)
        : [...product.flags, flag];

      await this.prismaService.product.update({
        where: { id },
        data: { flags: { set: product.flags } },
      });
    }
    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async updateWaste({
    id,
    dto,
  }: UpdateProductWasteProps): Promise<ProductEntity> {
    const { wasteId } = await this.prismaService.product.findFirst({
      select: { wasteId: true },
      where: { id: id },
    });
    await this.prismaService.wasteMaterial.deleteMany({
      where: {
        wasteId: wasteId,
        materialName: { notIn: dto.wasteMaterials.map((m) => m.material) },
      },
    });

    await this.prismaService.product.update(
      productWasteUpdateQuery(id, dto, wasteId)
    );

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async updateBillOfMaterial({
    id,
    dto,
  }: UpdateProductDependenciesProps): Promise<ProductEntity> {
    await this.prismaService.productPreliminaryProduct.deleteMany({
      where: {
        productId: id,
        preliminaryProductId: {
          notIn: dto.map.map((dto) => dto[0] ?? ''),
        },
      },
    });

    await this.prismaService.product.update(
      preliminaryConnectionUpdateQuery(dto.map, id, dto.description)
    );

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async updateProductionHistory({
    id,
    dto,
  }: UpdateProductionHistoryProps): Promise<ProductEntity> {
    await this.prismaService.product.update({
      where: { id: id },
      data: { productionHistory: historyUpdateQuery(dto.history, id) },
    });

    return await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
  }

  async createPreliminaryProductConnection({
    preliminaryProducts,
    productId,
  }: {
    preliminaryProducts: [ProductCreateDto, number][];
    productId: string;
  }): Promise<void> {
    for (const [preliminaryProduct, amount] of preliminaryProducts) {
      const id = await this.ensureProductExists(preliminaryProduct);
      await this.prismaService.productPreliminaryProduct.create({
        data: {
          productId: productId,
          preliminaryProductId: id,
          amount: amount,
        },
      });
    }
  }

  async ensureProductExists(product: ProductCreateDto): Promise<string> {
    let existing = await this.prismaService.product.findMany({
      where: {
        OR: [
          { id: product.id?.toString() },
          { productId: product.productId?.toString() },
        ],
      },
      take: 1,
    });
    if (!existing || existing.length === 0) {
      this.logger.debug(`No product with id ${product.id} found. Creating...`);
      const created = await this.prismaService.product.create(
        productCreateQuery(product, [])
      );
      existing = [created];
    }
    return existing[0].id;
  }

  async createPackagingConnection({
    packaging,
    productId,
  }: {
    packaging: [string, number][];
    productId: string;
  }): Promise<void> {
    await this.prismaService.productPackaging.createMany({
      data: (packaging ?? []).map(([packagingId, amount]) => ({
        packagingId,
        productId,
        amount,
      })),
    });
  }

  async getProductPackagings(id: string): Promise<[PackagingEntity, number][]> {
    const packagings = await this.prismaService.productPackaging.findMany({
      where: { productId: id },
      include: {
        packaging: {
          include: {
            products: { include: { product: true } },
            supplier: { include: { addresses: true } },
            waste: {
              include: {
                hazardousWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                normalWaste: {
                  include: {
                    utilizableWaste: true,
                    nonUtilizableWaste: true,
                  },
                },
                wasteMaterials: { include: { material: true } },
              },
            },
            materials: { include: { material: true } },
          },
        },
      },
    });

    return packagings.map((p) => [p.packaging, p.amount] as const);
  }
}
