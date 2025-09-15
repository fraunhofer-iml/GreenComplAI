/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthenticatedKCUser,
  AuthRoles,
  getRealmRole,
  ProductDto,
} from '@ap2/api-interfaces';
import { KeycloakUser, Roles } from 'nest-keycloak-connect';
import { Controller, Logger, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RawBody } from '../../RawBodyXML';
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
    summary: 'Import IDOC/XML from raw body payload',
    description:
      'Accepts the raw XML text of a SAP iDoc (e.g., MATMAS, ORDERS). Converts to GreenComplAI products and persists them.',
  })
  @ApiConsumes('application/xml', 'text/xml')
  @ApiBody({
    description: 'SAP iDoc XML payload',
    required: true,
    schema: {
      type: 'string',
      example: `<?xml version="1.0" encoding="UTF-8"?><IDOC>...</IDOC>`,
    },
  })
  @ApiOkResponse({
    description: 'Created Product',
    type: ProductDto,
  })
  async createProductFromIdocRaw(
    @KeycloakUser() user: AuthenticatedKCUser,
    @RawBody() idoc: string // RawBody to indicate that provided Payload Body is XML instead of JSON
  ): Promise<ProductDto> {
    return await this.idocService.createProductFromIdocRaw({
      idoc: idoc,
      userId: user.sub,
    });
  }
}
