/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpClientEnum, PackagingMessagePatterns } from '@ap2/amqp';
import {
  CreatePackagingProps,
  FindAllPackagingProps,
  PackagingDto,
  PackagingIdProps,
  PaginatedData,
  UpdatePackagingProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PackagingService {
  private readonly logger: Logger = new Logger(PackagingService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  createPackaging(props: CreatePackagingProps): Promise<PackagingDto> {
    return firstValueFrom(
      this.entityManagementService.send<PackagingDto>(
        PackagingMessagePatterns.CREATE,
        props
      )
    );
  }

  findOne(props: PackagingIdProps): Promise<PackagingDto> {
    return firstValueFrom(
      this.entityManagementService.send<PackagingDto>(
        PackagingMessagePatterns.READ_BY_ID,
        props
      )
    );
  }
  findPreliminary(props: PackagingIdProps): Promise<[PackagingDto, number][]> {
    return firstValueFrom(
      this.entityManagementService.send<[PackagingDto, number][]>(
        PackagingMessagePatterns.PRELIMINARY,
        props
      )
    );
  }

  findAll(props: FindAllPackagingProps): Promise<PaginatedData<PackagingDto>> {
    return firstValueFrom(
      this.entityManagementService.send<PaginatedData<PackagingDto>>(
        PackagingMessagePatterns.READ,
        props
      )
    );
  }

  update(props: UpdatePackagingProps): Promise<PackagingDto> {
    return firstValueFrom(
      this.entityManagementService.send<PackagingDto>(
        PackagingMessagePatterns.UPDATE,
        props
      )
    );
  }

  updatePartPackagigns(props: UpdatePackagingProps): Promise<void> {
    return firstValueFrom(
      this.entityManagementService.send(
        PackagingMessagePatterns.UPDATE_PART_PACKAGING,
        props
      )
    );
  }

  updateWaste(props: UpdatePackagingProps): Promise<void> {
    return firstValueFrom(
      this.entityManagementService.send(
        PackagingMessagePatterns.UPDATE_WASTE,
        props
      )
    );
  }

  delete(props: PackagingIdProps): Promise<void> {
    return firstValueFrom(
      this.entityManagementService.send(PackagingMessagePatterns.DELETE, props)
    );
  }
}
