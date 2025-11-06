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
  PackagingEntity,
  PaginatedData,
  ProductEntity,
  ProductEntityList,
  ProductOutlierDto,
  SearchProductsProps,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import { Injectable } from '@nestjs/common';
import { DocumentType, GCFile } from '@prisma/client';
import { ProductCrudService } from './product-crud.service';
import { ProductFileService } from './product-file.service';
import { ProductOutlierService } from './product-outlier.service';
import { ProductRelationsService } from './product-relations.service';
import { ProductSupplierService } from './product-supplier.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly crudService: ProductCrudService,
    private readonly relationsService: ProductRelationsService,
    private readonly outlierService: ProductOutlierService,
    private readonly supplierService: ProductSupplierService,
    private readonly fileService: ProductFileService
  ) {}

  async create(props: CreateProductProps): Promise<ProductEntity> {
    return this.crudService.create(props);
  }

  async getForOutlierDetection(): Promise<ProductEntityList[]> {
    return this.outlierService.getForOutlierDetection();
  }

  async findAll(
    props: FindAllProductsProps
  ): Promise<PaginatedData<ProductEntityList>> {
    return this.crudService.findAll(props);
  }

  async findAllOfSupplier(
    props: FindAllProductsProps & { supplierCompanyId: string }
  ): Promise<PaginatedData<ProductEntityList>> {
    return this.supplierService.findAll(props);
  }

  async findOne(props: FindProductByIdProps): Promise<ProductEntity | null> {
    return this.crudService.findOne(props);
  }

  async findOneOfSupplier(
    props: FindProductOfSupplierByIdProps
  ): Promise<ProductEntityList> {
    return this.supplierService.findOne(props);
  }

  async findOutliers(): Promise<ProductOutlierDto[]> {
    return this.outlierService.findOutliers();
  }

  async findPreliminaryProducts(
    props: FindProductByIdProps
  ): Promise<[ProductEntity, number][]> {
    return this.relationsService.findPreliminaryProducts(props);
  }

  async findProductPackaging(
    props: FindProductByIdProps
  ): Promise<[PackagingEntity, number][]> {
    return this.relationsService.findProductPackaging(props);
  }

  async update(props: UpdateProductProps): Promise<ProductEntity> {
    return this.crudService.update(props);
  }

  async updateSupplier(
    props: UpdateProductProps & { supplierCompanyId: string }
  ): Promise<ProductEntity> {
    return this.supplierService.update(props);
  }

  async delete(props: DeleteProductProps): Promise<ProductEntity> {
    return this.crudService.delete(props);
  }

  async search(props: SearchProductsProps): Promise<ProductEntityList[]> {
    return this.crudService.search(props);
  }

  async updatePackaging(
    props: UpdateProductDependenciesProps
  ): Promise<ProductEntity> {
    return this.relationsService.updatePackaging(props);
  }

  async updateFlags(props: UpdateFlagProductProps): Promise<ProductEntity> {
    return this.relationsService.updateFlags(props);
  }

  async validateOutlier(props: UpdateFlagProductProps): Promise<ProductEntity> {
    return this.outlierService.validateOutlier(props);
  }

  async updateWaste(props: UpdateProductWasteProps): Promise<ProductEntity> {
    return this.relationsService.updateWaste(props);
  }

  async updateBillOfMaterial(
    props: UpdateProductDependenciesProps
  ): Promise<ProductEntity> {
    return this.relationsService.updateBillOfMaterial(props);
  }

  async updateProductionHistory(
    props: UpdateProductionHistoryProps
  ): Promise<ProductEntity> {
    return this.relationsService.updateProductionHistory(props);
  }

  async uploadProductFile(
    file: Buffer,
    productId: string,
    type: DocumentType,
    mimeType: string,
    fileName: string
  ): Promise<void> {
    await this.fileService.uploadProductFile(
      file,
      fileName,
      productId,
      type,
      mimeType
    );
  }

  async getProductFiles(productId: string): Promise<GCFile[]> {
    return this.fileService.getProductFiles(productId);
  }

  async deleteProductFile(productId: string, fileId: string): Promise<void> {
    await this.fileService.deleteProductFile(productId, fileId);
  }

  async downloadProductFile(path: string): Promise<string> {
    return this.fileService.downloadProductFile(path);
  }
}
