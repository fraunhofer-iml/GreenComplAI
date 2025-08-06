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
  AuthenticatedKCUser,
  AuthRoles,
  CreateProductProps,
  DeleteProductProps,
  FindAllProductsProps,
  FindProductByIdProps,
  GenerateAnalysisProp,
  PackagingDto,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  ProductOutlierDto,
  ProductUpdateFlagsDto,
  SearchProductsProps,
  UpdateFlagProductProps,
  UpdateProductDependenciesProps,
  UpdateProductionHistoryProps,
  UpdateProductProps,
  UpdateProductWasteProps,
} from '@ap2/api-interfaces';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class ProductsService {
  private readonly logger: Logger = new Logger(ProductsService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy,
    private readonly companiesService: CompaniesService
  ) {}

  async create({ dto }: Partial<CreateProductProps>): Promise<ProductDto> {
    try {
      const outlierDetectionEnabled =
        process.env.OUTLIER_DETECTION_ENABLED === 'true';
      let outlierDetectionResult: string[] = [];
      if (outlierDetectionEnabled) {
        outlierDetectionResult = await this.runOutlierDetection(dto);
      }

      return firstValueFrom(
        this.entityManagementService.send(ProductMessagePatterns.CREATE, {
          dto,
          outlierDetectionResult,
        })
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  findAll(
    props: FindAllProductsProps,
    user: AuthenticatedKCUser
  ): Promise<PaginatedData<ProductDto>> {
    if (!user || !user.realm_access || !user.realm_access.roles) {
      throw new UnauthorizedException('User roles are not defined');
    }

    this.logger.debug(user.realm_access.roles);

    if (
      !user.realm_access.roles.includes(AuthRoles.SUSTAINABILITY_MANAGER) &&
      !user.realm_access.roles.includes(AuthRoles.BUYER)
    ) {
      // We know that the user is a supplier, so we need to filter products by supplierCompanyId
      return this.findAllForSupplier(props, user);
    }

    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductDto>>(
        ProductMessagePatterns.READ_ALL,
        props
      )
    );
  }

  async findAllForSupplier(
    props: FindAllProductsProps,
    user: AuthenticatedKCUser
  ): Promise<PaginatedData<ProductDto>> {
    const supplierCompanyId = await this.companiesService.findOneByUserId({
      id: user.sub,
    });

    if (!supplierCompanyId) {
      throw new UnauthorizedException(
        'Supplier company not found for the user'
      );
    }

    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductDto>>(
        ProductMessagePatterns.READ_ALL,
        {
          ...props,
          supplierCompanyId: supplierCompanyId.id,
        }
      )
    );
  }

  findOutliers(): Promise<ProductOutlierDto[]> {
    return firstValueFrom(
      this.entityManagementService.send(ProductMessagePatterns.OUTLIERS, {})
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

  async updateWaste(props: UpdateProductWasteProps) {
    await firstValueFrom(
      this.entityManagementService.send(
        ProductMessagePatterns.UPDATE_WASTE,
        props
      )
    );

    const validateProps: UpdateFlagProductProps = {
      id: props.id,
      dto: { flags: props.dto.fieldsToValidate },
    };

    return firstValueFrom(
      this.entityManagementService.send(
        ProductMessagePatterns.OUTLIERS_VALIDATE,
        validateProps
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

  updateFlags(props: { id: string; dto: ProductUpdateFlagsDto }) {
    return firstValueFrom(
      this.entityManagementService.send<ProductDto>(
        ProductMessagePatterns.UPDATE_FLAGS,
        props
      )
    );
  }

  validate(props: UpdateFlagProductProps): Promise<ProductOutlierDto> {
    return firstValueFrom(
      this.entityManagementService.send<ProductOutlierDto>(
        ProductMessagePatterns.OUTLIERS_VALIDATE,
        props
      )
    );
  }

  async runOutlierDetection(dto: ProductCreateDto): Promise<string[]> {
    const res = await axios.post(
      `${process.env.OUTLIER_DETECTION_URL}/outliers`,
      {
        recycledWastePercentage: dto.waste?.recycledWastePercentage ?? 0,
      }
    );

    if (res.status !== 200) {
      throw new Error('Failed to run outlier detection');
    }

    return res.data.outlier ? ['recycledWastePercentage'] : [];
  }
}
