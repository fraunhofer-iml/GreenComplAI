import {
  AuthenticatedKCUser,
  AuthRoles,
  CompanyDto,
  getRealmRole,
  ProductDto,
} from '@ap2/api-interfaces';
import { KeycloakUser, Roles } from 'nest-keycloak-connect';
/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IdocService } from './idoc.service';

@ApiTags('Idoc')
@Controller('Idoc')
export class IdocController {
  private readonly logger: Logger = new Logger(IdocController.name);

  constructor(private readonly idocService: IdocService) {}

  @Post()
  @Roles(
    getRealmRole(AuthRoles.SUSTAINABILITY_MANAGER),
    getRealmRole(AuthRoles.BUYER)
  )
  @ApiOperation({
    summary: 'Ingest IDOC/XML from raw body',
    description:
      'Accepts the raw XML text of a SAP iDoc (e.g., MATMAS, ORDERS). Converts to GreenComplAI products and persists them.',
  })
  @ApiOkResponse({
    description: 'Created Product',
    type: ProductDto,
  })
  async createProductFromIdocRaw(
    @KeycloakUser() user: AuthenticatedKCUser,
    @Body() idoc: string
  ): Promise<ProductDto> {
    return await this.idocService.createProductFromIdocRaw({
      idoc: idoc,
      userId: user.sub
    });
  }

  // @Post('upload')
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({
  //   summary: 'Upload IDOC/XML file (multipart/form-data)',
  //   description:
  //     'Alternative upload endpoint that accepts an XML file via multipart/form-data.',
  // })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: { type: 'string', format: 'binary' },
  //       source: { type: 'string' },
  //     },
  //     required: ['file'],
  //   },
  // })
  // @ApiResponse({ status: 201, type: IdocIngestResponse })
  // @UseInterceptors(FileInterceptor('file'))
  // async createProductFromIdocFile(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body('source') source?: string
  // ): Promise<IdocIngestResponse> {
  //   if (!file || !file.buffer?.length) {
  //     throw new BadRequestException('No file uploaded');
  //   }
  //   const xml = file.buffer.toString('utf8');
  //   return this.converter.convertAndPersist(xml, source);
  // }
}
