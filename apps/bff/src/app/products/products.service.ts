/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AmqpClientEnum,
  ProductMessagePatterns,
  UploadFileRequest,
} from '@ap2/amqp';
import {
  AnalysisDto,
  AuthenticatedKCUser,
  CompanyDto,
  CreateProductProps,
  DeleteProductProps,
  DocumentType,
  FileDto,
  FindAllProductsProps,
  FindProductByIdProps,
  GenerateAnalysisProp,
  ImportDppDto,
  PackagingDto,
  PackagingEntity,
  PaginatedData,
  ProductCreateDto,
  ProductDto,
  ProductEntity,
  ProductEntityList,
  ProductMasterDataDto,
  ProductOutlierDto,
  ProductUpdateDto,
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
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GCFile } from '@prisma/client';
import { CompaniesService } from '../companies/companies.service';
import { toPackagingDto } from '../packaging/packaging.mapper';
import { toProductDto, toProductDtoList } from './product.mapper';

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

      const entity = await firstValueFrom(
        this.entityManagementService.send<ProductEntity>(
          ProductMessagePatterns.CREATE,
          {
            dto,
            outlierDetectionResult,
          }
        )
      );

      const packagings = await this.findPackaging({ id: entity.id });
      return toProductDto(entity, packagings);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(
    props: FindAllProductsProps
  ): Promise<PaginatedData<ProductDto>> {
    const result = await firstValueFrom(
      this.entityManagementService.send<PaginatedData<ProductEntityList>>(
        ProductMessagePatterns.READ_ALL,
        props
      )
    );

    return {
      data: result.data.map((entity) => toProductDtoList(entity)),
      meta: result.meta,
    };
  }

  findOutliers(): Promise<ProductOutlierDto[]> {
    return firstValueFrom(
      this.entityManagementService.send(ProductMessagePatterns.OUTLIERS, {})
    );
  }

  async findOne(props: FindProductByIdProps): Promise<ProductDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity | null>(
        ProductMessagePatterns.READ_BY_ID,
        props
      )
    );

    if (!entity) {
      return null;
    }

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async findPreliminary(
    props: FindProductByIdProps
  ): Promise<[ProductDto, number][]> {
    const entities = await firstValueFrom(
      this.entityManagementService.send<[ProductEntity, number][]>(
        ProductMessagePatterns.PRELIMINARY,
        props
      )
    );

    return entities.map(([entity, amount]) => [
      toProductDto(entity) as ProductDto,
      amount,
    ]);
  }

  async findPackaging(
    props: FindProductByIdProps
  ): Promise<[PackagingDto, number][]> {
    const entities = await firstValueFrom(
      this.entityManagementService.send<[PackagingEntity, number][]>(
        ProductMessagePatterns.PACKAGING,
        props
      )
    );

    return entities.map(([entity, amount]) => [
      toPackagingDto(entity) as PackagingDto,
      amount,
    ]);
  }

  async update(props: UpdateProductProps): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE,
        props
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async updateBOM(props: UpdateProductDependenciesProps): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE_BOM,
        props
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async updatePackaging(
    props: UpdateProductDependenciesProps
  ): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE_PACKAGING,
        props
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async updateProductionHistory(
    props: UpdateProductionHistoryProps
  ): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE_HISTORY,
        props
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async updateWaste(props: UpdateProductWasteProps): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE_WASTE,
        props
      )
    );

    const validateProps: UpdateFlagProductProps = {
      id: props.id,
      dto: { flags: props.dto.fieldsToValidate },
    };

    await firstValueFrom(
      this.entityManagementService.send(
        ProductMessagePatterns.OUTLIERS_VALIDATE,
        validateProps
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
  }

  async remove(props: DeleteProductProps): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.DELETE,
        props
      )
    );

    // After deletion, packagings are not available; pass an empty array.
    return toProductDto(entity, []);
  }

  async search(props: SearchProductsProps): Promise<ProductDto[]> {
    const entities = await firstValueFrom(
      this.entityManagementService.send<ProductEntityList[]>(
        ProductMessagePatterns.SEARCH,
        props
      )
    );

    return entities.map((entity) => toProductDtoList(entity));
  }

  getAnalysis(props: GenerateAnalysisProp): Promise<AnalysisDto> {
    return firstValueFrom(
      this.entityManagementService.send<AnalysisDto>(
        ProductMessagePatterns.GET_ANALYSIS,
        props
      )
    );
  }

  async updateFlags(props: {
    id: string;
    dto: ProductUpdateFlagsDto;
  }): Promise<ProductDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        ProductMessagePatterns.UPDATE_FLAGS,
        props
      )
    );

    const packagings = await this.findPackaging({ id: entity.id });
    return toProductDto(entity, packagings);
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

  async uploadProductFile({
    file,
    productId,
    type,
    fileName,
  }: {
    file: Express.Multer.File;
    productId: string;
    type: DocumentType;
    fileName: string;
  }): Promise<void> {
    await firstValueFrom(
      this.entityManagementService.send<void>(
        ProductMessagePatterns.UPLOAD_FILE,
        {
          file: file.buffer,
          productId,
          type,
          mimeType: file.mimetype,
          fileName,
        } satisfies UploadFileRequest
      )
    );
  }

  async getProductFiles(productId: string): Promise<FileDto[]> {
    return firstValueFrom(
      this.entityManagementService.send<GCFile[]>(
        ProductMessagePatterns.GET_FILES,
        { id: productId }
      )
    );
  }

  async downloadProductFile(path: string): Promise<string> {
    return firstValueFrom(
      this.entityManagementService.send<string>(
        ProductMessagePatterns.DOWNLOAD_FILE,
        { path }
      )
    );
  }

  async deleteProductFile({
    productId,
    fileId,
  }: {
    productId: string;
    fileId: string;
  }): Promise<void> {
    await firstValueFrom(
      this.entityManagementService.send<void>(
        ProductMessagePatterns.DELETE_FILE,
        { productId, fileId }
      )
    );
  }

  async importFromDpp(dto: ImportDppDto, userId: string) {
    let supplier: CompanyDto | undefined;

    this.logger.debug(userId);

    if (dto.supplier) {
      const { company, username } =
        await this.companiesService.createAssociatedCompany({
          dto: dto.supplier,
          userId: userId,
        });
      supplier = company;
    }

    this.logger.debug(supplier);

    if (dto.id) {
      return this.updateFromDpp(dto, supplier);
    }
    return this.createFromDpp(dto, supplier);
  }

  updateFromDpp(dto: ImportDppDto, supplier: CompanyDto) {
    const masterData: Partial<ProductMasterDataDto> = {
      gtin: dto.gtin,
      taricCode: dto.taricCode,
      supplier: supplier?.id,
      name: dto.name,
      waterUsed: dto.waterUsed,
      digitalProductPassportUrl: `dpp/${dto.aasIdentifier}`,
      reparability: dto.reparability,
    };
    this.logger.debug(dto.materials);
    console.log('materials');
    const productUpdateDto: ProductUpdateDto = {
      masterData: masterData,
      criticalRawMaterials: dto.criticalRawMaterials,
      materials: dto.materials,
      rareEarths: undefined,
    };

    this.logger.debug(dto.id);
    return this.update({ id: dto.id, dto: productUpdateDto });
  }

  createFromDpp(dto: ImportDppDto, supplier?: CompanyDto) {
    const productCreateDto: ProductCreateDto = {
      productId: `aas-id-${dto.productId ?? dto.aasIdentifier}`,
      gtin: dto.gtin,
      taricCode: dto.taricCode,
      supplier: supplier?.id ?? null,
      name: dto.name,
      waterUsed: dto.waterUsed,
      materials: dto.materials,
      criticalRawMaterials: dto.criticalRawMaterials,
      digitalProductPassportUrl: `dpp/${dto.aasIdentifier}`,
      reparability: dto.reparability,
      flags: [],
    };

    if (!productCreateDto.name) {
      productCreateDto.name = productCreateDto.productId;
      productCreateDto.flags.push('name');
    }
    console.log(productCreateDto);

    return this.create({ dto: productCreateDto });
  }
}
