/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IdocMessagePatterns } from '@ap2/amqp';
import {
  CreateProductFromIdocRawProps,
  ProductDto,
} from '@ap2/api-interfaces';
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IdocService } from './idoc.service';


@Controller()
export class IdocController {
  private readonly logger: Logger = new Logger(IdocController.name);

  constructor(private readonly idocService: IdocService) {}

  @MessagePattern(IdocMessagePatterns.CREATE)
  async createProductFromIdocRaw(
    @Payload() payload: CreateProductFromIdocRawProps
  ): Promise<ProductDto> {
    return await this.idocService.createProductFromIdocRaw(
      payload.idoc,
      payload.userId
    );
  }
}
