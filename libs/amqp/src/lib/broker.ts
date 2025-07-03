/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AmqpClientEnum } from './queues';

export class Broker {
  public getEntityManagerBroker(): DynamicModule {
    return this.getMessageBroker(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT);
  }

  private getMessageBroker(queue: string): DynamicModule {
    const amqpUri = process.env['AMQP_URI'];

    if (!amqpUri) {
      throw new Error('AMQP_URI not defined');
    }

    return ClientsModule.register([
      {
        name: queue,
        transport: Transport.RMQ,
        options: {
          urls: [amqpUri],
          queue: queue,
          queueOptions: {
            durable: false,
          },
        },
      },
    ]);
  }
}
