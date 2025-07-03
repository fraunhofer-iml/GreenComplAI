/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductMessagePatterns } from '@ap2/amqp';
import {
  AnalysisDto,
  CreateProductProps,
  DeleteProductProps,
  FindAllProductsProps,
  FindProductByIdProps,
  GenerateAnalysisProp,
  PackagingDto,
  PaginatedData,
  ProductDto,
  SearchProductsProps,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductAnalysisService } from './analysis.service';
import { ProductService } from './products.service';

@Controller()
export class ProductController {
  private readonly logger: Logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly productAnalysisService: ProductAnalysisService
  ) {}

  @MessagePattern(ProductMessagePatterns.CREATE)
  create(@Payload() payload: CreateProductProps): Promise<ProductDto> {
    return this.productService.create(payload);
  }

  @MessagePattern(ProductMessagePatterns.READ_ALL)
  findAll(
    @Payload()
    payload: FindAllProductsProps
  ): Promise<PaginatedData<ProductDto>> {
    return this.productService.findAll(payload);
  }

  @MessagePattern(ProductMessagePatterns.GET_FOR_OUTLIER_DETECTION)
  getForOutlierDetection(): Promise<ProductDto[]> {
    return this.productService.getForOutlierDetection();
  }

  @MessagePattern(ProductMessagePatterns.READ_BY_ID)
  findOne(@Payload() payload: FindProductByIdProps): Promise<ProductDto> {
    return this.productService.findOne(payload);
  }

  @MessagePattern(ProductMessagePatterns.PRELIMINARY)
  async findPreliminaryProducts(
    @Payload() payload: FindProductByIdProps
  ): Promise<[ProductDto, number][]> {
    return this.productService.findPreliminaryProducts(payload);
  }

  @MessagePattern(ProductMessagePatterns.PACKAGING)
  async findPackaging(
    @Payload() payload: FindProductByIdProps
  ): Promise<[PackagingDto, number][]> {
    return this.productService.findProductPackaging(payload);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE)
  update(@Payload() payload: UpdateProductProps): Promise<ProductDto> {
    return this.productService.update(payload);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE_BOM)
  updateBOM(
    @Payload() payload: UpdateProductDependenciesProps
  ): Promise<ProductDto> {
    return this.productService.updateBillOfMaterial(payload);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE_PACKAGING)
  updatePackaging(
    @Payload() payload: UpdateProductDependenciesProps
  ): Promise<ProductDto> {
    return this.productService.updatePackaging(payload);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE_WASTE)
  updateWaste(
    @Payload() payload: UpdateProductWasteProps
  ): Promise<ProductDto> {
    return this.productService.updateWaste(payload);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE_HISTORY)
  updateProductionHistory(
    @Payload() payload: UpdateProductionHistoryProps
  ): Promise<ProductDto> {
    return this.productService.updateProductionHistory(payload);
  }

  @MessagePattern(ProductMessagePatterns.DELETE)
  delete(@Payload() payload: DeleteProductProps): Promise<ProductDto> {
    return this.productService.delete(payload);
  }

  @MessagePattern(ProductMessagePatterns.SEARCH)
  search(@Payload() payload: SearchProductsProps): Promise<ProductDto[]> {
    return this.productService.search(payload);
  }

  @MessagePattern(ProductMessagePatterns.GET_ANALYSIS)
  getAnalysis(
    @Payload() generateAnalysisProp: GenerateAnalysisProp
  ): Promise<AnalysisDto> {
    return this.productAnalysisService.getAnalysis(generateAnalysisProp);
  }

  @MessagePattern(ProductMessagePatterns.UPDATE_FLAGS)
  updateFlags(@Payload() payload: UpdateFlagProductProps): Promise<ProductDto> {
    return this.productService.updateFlags(payload);
  }
}
