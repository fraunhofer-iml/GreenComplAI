/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, IdocMessagePatterns } from '@ap2/amqp';
import {
  CreateProductFromIdocRawProps,
  ProductEntity,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class IdocService {
  private readonly logger: Logger = new Logger(IdocService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  createProductFromIdocRaw(
    props: CreateProductFromIdocRawProps
  ): Promise<ProductEntity> {
    return firstValueFrom(
      this.entityManagementService.send<ProductEntity>(
        IdocMessagePatterns.CREATE,
        props
      )
    );
  }
}
