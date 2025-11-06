/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum } from '@ap2/amqp';
import { ConfigurationService } from '@ap2/configuration';
import { PrismaErrorsInterceptor } from '@ap2/database';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configuration = appContext.get(ConfigurationService);
  const amqpUri = configuration.getGeneralConfig().amqpUri;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [amqpUri],
        queue: AmqpClientEnum.QUEUE_DPP,
        queueOptions: {
          durable: false,
        },
      },
    }
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    })
  );
  app.useGlobalInterceptors(new PrismaErrorsInterceptor());
  app.useLogger(configuration.getGeneralConfig().logLevel);

  await app.listen().then(() =>
    Logger.log(
      `📊 DPP service is running with RMQ:
        ${amqpUri}:${AmqpClientEnum.QUEUE_DPP}`
    )
  );
}

bootstrap();
