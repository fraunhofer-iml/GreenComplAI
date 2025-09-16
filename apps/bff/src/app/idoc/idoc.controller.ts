/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthenticatedKCUser, AuthRoles, getRealmRole, ProductDto } from '@ap2/api-interfaces';
import { KeycloakUser, Roles } from 'nest-keycloak-connect';
import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdocService } from './idoc.service';

@ApiTags('Idoc')
@ApiBearerAuth()
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
    summary: 'Upload IDOC/XML file (multipart/form-data)',
    description:
      'Accepts an XML file upload (SAP iDoc, e.g., MATMAS, ORDERS), parses it and persists as Product.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'Created Product',
    type: ProductDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async createProductFromIdocRaw(
    @KeycloakUser() user: AuthenticatedKCUser,
    @UploadedFile() file: Express.Multer.File
  ): Promise<ProductDto> {
    this.logger.log('[bff/IdocController] - Entered via file upload');

    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No XML file uploaded');
    }

    const xml = file.buffer.toString('utf8');
    this.logger.log(
      `[bff/IdocController] - XML file received, size: ${file.size} bytes`
    );
    return await this.idocService.createProductFromIdocRaw({
      idoc: xml,
      userId: user.sub,
    });
  }
}
