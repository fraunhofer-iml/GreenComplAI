/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpException } from '@ap2/amqp';
import { catchError, Observable } from 'rxjs';
import {
  CallHandler,
  Catch,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
@Catch(
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError
)
export class PrismaErrorsInterceptor implements NestInterceptor {
  intercept(
    _: ExecutionContext,
    next: CallHandler<unknown>
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) => {
        const errorMessage = err.message
          .replace(/\n/g, ' ') // Remove new lines
          .replace(/[ \t]+/g, ' ') // Remove multiple spaces
          .replace(/"/g, "'"); // Replace double quotes with single quotes

        const errorCode = err?.error?.status
          ? err.error.status
          : HttpStatus.BAD_REQUEST;

        throw new AmqpException(errorMessage, errorCode);
      })
    );
  }
}
