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
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern(DppMessagePatterns.CREATE_DPP)
  createDpp(data: { product: ProductDto; uploadedFiles: FileDto[] }) {
    return this.appService.createDpp(data.product, data.uploadedFiles);
  }

  @MessagePattern(DppMessagePatterns.GET_DPP)
  getDpp(@Payload() data: { aasIdentifier: string }) {
    return this.appService.getDpp(data.aasIdentifier);
  }

  @MessagePattern(DppMessagePatterns.GET_PRODUCT)
  getProduct(data: { id: string }) {
    return this.appService.getProductFromDpp(data.id);
  }

  @MessagePattern(DppMessagePatterns.GET_NFT)
  getDppNft(data: { dppId: string }) {
    return this.appService.getDPPNft(data.dppId);
  }
}
