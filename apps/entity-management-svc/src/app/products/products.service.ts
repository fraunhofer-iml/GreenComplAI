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
  FindProductOfSupplierByIdProps,
  PackagingDto,
  PaginatedData,
  ProductDto,
  ProductOutlierDto,
  SearchProductsProps,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import { Injectable } from '@nestjs/common';
import { ProductCrudService } from './product-crud.service';
import { ProductOutlierService } from './product-outlier.service';
import { ProductRelationsService } from './product-relations.service';
import { ProductSupplierService } from './product-supplier.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly crudService: ProductCrudService,
    private readonly relationsService: ProductRelationsService,
    private readonly outlierService: ProductOutlierService,
    private readonly supplierService: ProductSupplierService
  ) {}

  async create(props: CreateProductProps): Promise<ProductDto> {
    return this.crudService.create(props);
  }

  async getForOutlierDetection(): Promise<ProductDto[]> {
    return this.outlierService.getForOutlierDetection();
  }

  async findAll(
    props: FindAllProductsProps
  ): Promise<PaginatedData<ProductDto>> {
    return this.crudService.findAll(props);
  }

  async findAllOfSupplier(
    props: FindAllProductsProps & { supplierCompanyId: string }
  ): Promise<PaginatedData<Partial<ProductDto>>> {
    return this.supplierService.findAll(props);
  }

  async findOne(props: FindProductByIdProps): Promise<ProductDto> {
    return this.crudService.findOne(props);
  }

  async findOneOfSupplier(
    props: FindProductOfSupplierByIdProps
  ): Promise<Partial<ProductDto>> {
    return this.supplierService.findOne(props);
  }

  async findOutliers(): Promise<ProductOutlierDto[]> {
    return this.outlierService.findOutliers();
  }

  async findPreliminaryProducts(
    props: FindProductByIdProps
  ): Promise<[ProductDto, number][]> {
    return this.relationsService.findPreliminaryProducts(props);
  }

  async findProductPackaging(
    props: FindProductByIdProps
  ): Promise<[PackagingDto, number][]> {
    return this.relationsService.findProductPackaging(props);
  }

  async update(props: UpdateProductProps): Promise<ProductDto> {
    return this.crudService.update(props);
  }

  async updateSupplier(
    props: UpdateProductProps & { supplierCompanyId: string }
  ): Promise<ProductDto> {
    return this.supplierService.update(props);
  }

  async delete(props: DeleteProductProps): Promise<ProductDto> {
    return this.crudService.delete(props);
  }

  async search(props: SearchProductsProps): Promise<ProductDto[]> {
    return this.crudService.search(props);
  }

  async updatePackaging(
    props: UpdateProductDependenciesProps
  ): Promise<ProductDto> {
    return this.relationsService.updatePackaging(props);
  }

  async updateFlags(props: UpdateFlagProductProps): Promise<ProductDto> {
    return this.relationsService.updateFlags(props);
  }

  async validateOutlier(props: UpdateFlagProductProps): Promise<ProductDto> {
    return this.outlierService.validateOutlier(props);
  }

  async updateWaste(props: UpdateProductWasteProps) {
    return this.relationsService.updateWaste(props);
  }

  async updateBillOfMaterial(
    props: UpdateProductDependenciesProps
  ): Promise<ProductDto> {
    return this.relationsService.updateBillOfMaterial(props);
  }

  async updateProductionHistory(
    props: UpdateProductionHistoryProps
  ): Promise<ProductDto> {
    return this.relationsService.updateProductionHistory(props);
  }
}
