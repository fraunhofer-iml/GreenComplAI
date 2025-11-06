/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DppMessagePatterns } from '@ap2/amqp';
import { FileDto, ProductDto } from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern(DppMessagePatterns.CREATE_DPP)
  createDpp(data: { product: ProductDto; uploadedFiles: FileDto[] }) {
    return this.appService.createDpp(data.product, data.uploadedFiles);
  }

  @MessagePattern(DppMessagePatterns.GET_DPP)
  getDpp(data: { aasIdentifier: string }) {
    return this.appService.getDpp(data.aasIdentifier);
  }
}
