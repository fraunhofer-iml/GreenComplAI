/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, ProductMessagePatterns } from '@ap2/amqp';
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
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ProductsService {
  private readonly logger: Logger = new Logger(ProductsService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  create(props: CreateProductProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.CREATE,
        props
      )
    );
  }

  findAll(props: FindAllProductsProps): Promise<PaginatedData<ProductDto>> {
    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductDto>>(
        ProductMessagePatterns.READ_ALL,
        props
      )
    );
  }

  findOne(props: FindProductByIdProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.READ_BY_ID,
        props
      )
    );
  }

  findPreliminary(
    props: FindProductByIdProps
  ): Promise<[ProductDto, number][]> {
    return firstValueFrom(
      this.entityManagementService.send<[ProductDto, number][]>(
        ProductMessagePatterns.PRELIMINARY,
        props
      )
    );
  }

  findPackaging(
    props: FindProductByIdProps
  ): Promise<[PackagingDto, number][]> {
    return firstValueFrom(
      this.entityManagementService.send<[PackagingDto, number][]>(
        ProductMessagePatterns.PACKAGING,
        props
      )
    );
  }

  update(props: UpdateProductProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE,
        props
      )
    );
  }

  updateBOM(props: UpdateProductDependenciesProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_BOM,
        props
      )
    );
  }

  updatePackaging(props: UpdateProductDependenciesProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_PACKAGING,
        props
      )
    );
  }

  updateProductionHistory(
    props: UpdateProductionHistoryProps
  ): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_HISTORY,
        props
      )
    );
  }

  updateWaste(props: UpdateProductWasteProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_WASTE,
        props
      )
    );
  }

  remove(props: DeleteProductProps): Promise<ProductDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.DELETE,
        props
      )
    );
  }

  search(props: SearchProductsProps): Promise<ProductDto[]> {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto[]>(
        ProductMessagePatterns.SEARCH,
        props
      )
    );
  }

  getAnalysis(props: GenerateAnalysisProp): Promise<AnalysisDto> {
    return firstValueFrom(
      this.entityManagementService.send<AnalysisDto>(
        ProductMessagePatterns.GET_ANALYSIS,
        props
      )
    );
  }

  updateFlags(props: { id: string; dto: string[] }) {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_FLAGS,
        props
      )
    );
  }
}
