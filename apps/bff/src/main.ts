/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationService } from '@ap2/configuration';
import * as bodyParser from 'body-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuration = app.get(ConfigurationService);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const config = new DocumentBuilder()
    .setTitle('SKALA AP2 backend for frontend')
    .setVersion('0.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  const swaggerPath = configuration.getGeneralConfig().swaggerPath;
  SwaggerModule.setup(swaggerPath, app, documentFactory);

  const port = process.env.PORT || 3000;
  app.enableCors();
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
