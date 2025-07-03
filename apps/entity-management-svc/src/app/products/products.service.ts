/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CreateProductProps,
  DeleteProductProps,
  FindAllProductsProps,
  FindProductByIdProps,
  PackagingDto,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  SearchProductsProps,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
  ValidUnits,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FlagsService } from '../flags/flags.service';
import { getTotalWeightOfWaste } from '../utils/weight.utils';
import { WasteService } from '../waste/waste.service';
import { productCreateQuery } from './queries/product-create.query';
import { productFindManyQuery } from './queries/product-find-many.query';
import { productFindUniqueQuery } from './queries/product-find-unique.query';
import {
  historyUpdateQuery,
  packagingConnectionUpdateQuery,
  preliminaryConnectionUpdateQuery,
  productUpdateQuery,
  productWasteUpdateQuery,
} from './queries/product-update.query';

@Injectable()
export class ProductService {
  private readonly logger: Logger = new Logger(PrismaService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly wasteService: WasteService,
    private readonly flagService: FlagsService
  ) {}

  async create({ dto }: CreateProductProps): Promise<ProductDto> {
    if (!Object.values(ValidUnits).some((u) => u == dto.unit)) {
      dto.flags.push('unit');
      dto.unit = undefined;
    }

    dto.flags = this.flagService.evaluateFlag(
      dto,
      new ProductCreateDto('', []),
      dto.flags
    );

    const product = await this.prismaService.product.create(
      productCreateQuery(dto)
    );

    if (dto.billOfMaterial)
      await this.createPreliminaryProductConnection({
        preliminaryProducts: dto.billOfMaterial,
        productId: product.id,
      });

    if (dto.waste)
      await this.wasteService.createWasteAmountConnection(
        product.wasteId,
        dto.waste
      );

    if (dto.packagings)
      await this.createPackagingConnection({
        packaging: dto.packagings,
        productId: product.id,
      });

    return {
      ...product,
    };
  }

  async getForOutlierDetection(): Promise<ProductDto[]> {
    return this.prismaService.product.findMany({
      include: {
        waste: {
          select: {
            recycledWastePercentage: true,
          },
        },
      },
    });
  }

  async findAll({
    filters,
    page,
    size,
    sorting,
    isSellable,
  }: FindAllProductsProps): Promise<PaginatedData<ProductDto>> {
    const skip: number = (page - 1) * size;

    const f = this.getWhereCondition(filters, isSellable);

    const products = await this.prismaService.product.findMany(
      productFindManyQuery({
        filters: f ? f : undefined,
        size,
        skip,
        sorting,
      })
    );

    const totalCount = await this.prismaService.product.count({
      where: f,
    });

    return {
      data: products.map((p) => ({
        ...p,
        materials: p.materials.map((m) => [m.material, m.percentage] as const),
        wasteFlow: p.wasteFlow?.name,

        rareEarths: p.rareEarths.map(
          (m) => [m.material, m.percentage] as const
        ),
        criticalRawMaterials: p.criticalRawMaterials.map(
          (m) => [m.material, m.percentage] as const
        ),
      })),
      meta: { page: page, pageSize: size, totalCount: totalCount },
    };
  }

  async findOne({ id }: FindProductByIdProps): Promise<ProductDto> {
    const product = await this.prismaService.product.findUnique(
      productFindUniqueQuery(id)
    );
    const packagings = await this.getProductPackagings(id);
    const totalWeight = getTotalWeightOfWaste(product.waste);

    return {
      ...product,
      packagings,
      materials: product.materials.map(
        (m) => [m.material, m.percentage] as const
      ),
      wasteFlow: product.wasteFlow?.name ? product.wasteFlow.name : 'N/A',
      rareEarths: product.rareEarths.map(
        (m) => [m.material, m.percentage] as const
      ),
      criticalRawMaterials: product.criticalRawMaterials.map(
        (m) => [m.material, m.percentage] as const
      ),
      waste: {
        ...product.waste,
        wasteMaterials: product.waste
          ? product.waste.wasteMaterials.map((mat) => ({
              ...mat,
              weightInKg: mat.percentage * totalWeight,
            }))
          : [],
      },
    };
  }

  async findPreliminaryProducts({
    id,
  }: FindProductByIdProps): Promise<[ProductDto, number][]> {
    const products =
      await this.prismaService.productPreliminaryProduct.findMany({
        where: { productId: id?.toString() },
        include: {
          preliminaryProduct: {
            include: {
              supplier: { include: { addresses: true } },
              waste: {
                include: { wasteMaterials: { include: { material: true } } },
              },
              rareEarths: { include: { material: true } },
              criticalRawMaterials: { include: { material: true } },
            },
          },
        },
      });

    return products.map(
      (p) =>
        [
          {
            ...p.preliminaryProduct,
            rareEarths: p.preliminaryProduct.rareEarths.map(
              (m) => [m.material, m.percentage] as const
            ),
            criticalRawMaterials: p.preliminaryProduct.criticalRawMaterials.map(
              (m) => [m.material, m.percentage] as const
            ),
          },
          p.amount,
        ] as const
    );
  }

  async findProductPackaging({
    id,
  }: FindProductByIdProps): Promise<[PackagingDto, number][]> {
    const packagings = await this.prismaService.productPackaging.findMany({
      where: { productId: id },
      include: {
        packaging: {
          include: {
            supplier: { include: { addresses: true } },
            material: true,
          },
        },
      },
    });

    return packagings.map(
      (p) =>
        [
          {
            ...p.packaging,
          },
          p.amount,
        ] as const
    );
  }

  async update({ dto, id }: UpdateProductProps): Promise<ProductDto> {
    await this.prismaService.productMaterials.deleteMany({
      where: {
        productId: id,
        materialName: { notIn: dto.materials.map((m) => m.material) },
      },
    });

    await this.prismaService.rareEarths.deleteMany({
      where: {
        productId: id,
        materialName: { notIn: dto.rareEarths.map((m) => m.material) },
      },
    });

    await this.prismaService.criticalRawMaterials.deleteMany({
      where: {
        productId: id,
        materialName: {
          notIn: dto.criticalRawMaterials.map((m) => m.material),
        },
      },
    });

    const product = await this.prismaService.product.update({
      where: {
        id,
      },
      ...productUpdateQuery(dto, id),
    });

    return {
      ...product,
    };
  }

  async delete({ id }: DeleteProductProps): Promise<ProductDto> {
    const p = await this.prismaService.product.delete({
      where: {
        id,
      },
    });
    return {
      ...p,
    };
  }

  async search({ value }: SearchProductsProps): Promise<ProductDto[]> {
    if (value === '') return [];

    const whereCondition = {
      OR: [
        { name: { contains: value } },
        { productGroup: { name: { contains: value } } },
        { manufacturer: { name: { contains: value } } },
        { supplier: { name: { contains: value } } },
        { category: { contains: value } },
        { productId: { contains: value } },
      ],
    };
    const result = await this.prismaService.product.findMany({
      where: whereCondition,
      include: {
        supplier: { include: { addresses: true } },
        manufacturer: { include: { addresses: true } },
        productGroup: true,
        rareEarths: { include: { material: true } },
        criticalRawMaterials: { include: { material: true } },
      },
    });
    return result.map((p) => ({
      ...p,
      rareEarths: p.rareEarths.map((m) => [m.material, m.percentage] as const),
      criticalRawMaterials: p.criticalRawMaterials.map(
        (m) => [m.material, m.percentage] as const
      ),
    }));
  }

  async updatePackaging({
    id,
    dto,
  }: UpdateProductDependenciesProps): Promise<ProductDto> {
    await this.prismaService.productPackaging.deleteMany({
      where: {
        productId: id,
        packagingId: {
          notIn: dto.map.map((dto) => dto[0] ?? ''),
        },
      },
    });

    return await this.prismaService.product.update(
      packagingConnectionUpdateQuery(dto.map, id)
    );
  }

  async updateFlags({ id, dto }: UpdateFlagProductProps): Promise<ProductDto> {
    const product = await this.findOne({ id } as FindProductByIdProps);
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
    return product as ProductDto;
  }

  async updateWaste({ id, dto }: UpdateProductWasteProps): Promise<ProductDto> {
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

    return await this.prismaService.product.update(
      productWasteUpdateQuery(id, dto, wasteId)
    );
  }

  async updateBillOfMaterial({
    id,
    dto,
  }: UpdateProductDependenciesProps): Promise<ProductDto> {
    await this.prismaService.productPreliminaryProduct.deleteMany({
      where: {
        productId: id,
        preliminaryProductId: {
          notIn: dto.map.map((dto) => dto[0] ?? ''),
        },
      },
    });

    return await this.prismaService.product.update(
      preliminaryConnectionUpdateQuery(dto.map, id, dto.description)
    );
  }

  async updateProductionHistory({
    id,
    dto,
  }: UpdateProductionHistoryProps): Promise<ProductDto> {
    return await this.prismaService.product.update({
      where: { id: id },
      data: { productionHistory: historyUpdateQuery(dto.history, id) },
    });
  }

  private async createPreliminaryProductConnection({
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

  private async ensureProductExists(
    product: ProductCreateDto
  ): Promise<string> {
    let existing: ProductDto[] = await this.prismaService.product.findMany({
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
      existing = [await this.create({ dto: product })];
    }
    return existing[0].id;
  }

  private getWhereCondition(
    filter: string | undefined,
    isSellable?: boolean
  ): Prisma.ProductWhereInput {
    const filterAsNumber = Number(filter);

    const conditions: Prisma.ProductWhereInput[] = [];

    // Add isSellable condition if defined
    if (isSellable !== undefined) {
      conditions.push({ isSellable });
    }

    // Add filter conditions only if filter is provided
    if (filter && filter !== '') {
      const orCondition: Prisma.ProductWhereInput = {
        OR: [
          { id: { contains: filter } },
          { productId: { contains: filter } },
          { name: { contains: filter } },
          { description: { contains: filter } },
          { category: { contains: filter } },
          { productGroup: { name: { contains: filter } } },
          { wasteFlow: { name: { contains: filter } } },
          { supplier: { name: { contains: filter } } },
          { manufacturer: { name: { contains: filter } } },
          {
            materials: {
              some: { material: { name: { contains: filter } } },
            },
          },
        ],
      };

      if (!Number.isNaN(filterAsNumber)) {
        const whereNumber: Prisma.ProductWhereInput[] = [
          { percentageOfBiologicalMaterials: { equals: filterAsNumber / 100 } },
        ];
        orCondition.OR = [...orCondition.OR, ...whereNumber];
      }

      conditions.push(orCondition);
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private async createPackagingConnection({
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

  private async getProductPackagings(
    id: string
  ): Promise<[PackagingDto, number][]> {
    const packagings = await this.prismaService.productPackaging.findMany({
      where: { productId: id },
      include: {
        packaging: {
          include: {
            waste: true,
            material: true,
            supplier: { include: { addresses: true } },
          },
        },
      },
    });

    return packagings.map((p) => [p.packaging, p.amount]);
  }
}
