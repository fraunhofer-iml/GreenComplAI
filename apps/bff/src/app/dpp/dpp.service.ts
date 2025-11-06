/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  Submodel,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { AmqpClientEnum, DppMessagePatterns } from '@ap2/amqp';
import { firstValueFrom } from 'rxjs';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ProductsService } from '../products/products.service';

@Injectable()
export class DppService {
  private readonly logger: Logger = new Logger(DppService.name);

  constructor(
    private readonly productsService: ProductsService,
    @Inject(AmqpClientEnum.QUEUE_DPP) private readonly dppClient: ClientProxy
  ) {}

  async createDpp(productId: string): Promise<void> {
    try {
      const product = await this.productsService.findOne({ id: productId });

      const uploadedFiles =
        await this.productsService.getProductFiles(productId);

      const dpp = await firstValueFrom(
        this.dppClient.send(DppMessagePatterns.CREATE_DPP, {
          product,
          uploadedFiles,
        })
      );

      product.digitalProductPassportUrl = dpp.id;

      await this.productsService.update({
        id: productId,
        dto: {
          masterData: {
            digitalProductPassportUrl: `dpp/${dpp.id}`,
          },
          materials: undefined,
          rareEarths: undefined,
          criticalRawMaterials: undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create DPP for product ${productId}:`,
        error
      );
      throw new HttpException(
        'Failed to create DPP',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getDpp(
    aasIdentifier: string
  ): Promise<AssetAdministrationShell & { connectedSubmodels: Submodel[] }> {
    const dpp = await firstValueFrom(
      this.dppClient.send<
        AssetAdministrationShell & { connectedSubmodels: Submodel[] }
      >(DppMessagePatterns.GET_DPP, {
        aasIdentifier,
      })
    );

    return dpp;
  }
}
