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
  PackagingEntity,
  PackagingEntityList,
  PackagingIdProps,
  PaginatedData,
  UpdatePackagingProps,
} from '@ap2/api-interfaces';
import { firstValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { toPackagingDto, toPackagingDtoList } from './packaging.mapper';

@Injectable()
export class PackagingService {
  private readonly logger: Logger = new Logger(PackagingService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  async createPackaging(props: CreatePackagingProps): Promise<PackagingDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<PackagingEntity>(
        PackagingMessagePatterns.CREATE,
        props
      )
    );
    return toPackagingDto(entity);
  }

  async findOne(props: PackagingIdProps): Promise<PackagingDto | null> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<PackagingEntity | null>(
        PackagingMessagePatterns.READ_BY_ID,
        props
      )
    );
    return toPackagingDto(entity);
  }
  async findPreliminary(
    props: PackagingIdProps
  ): Promise<[PackagingDto, number][]> {
    const entities = await firstValueFrom(
      this.entityManagementService.send<[PackagingEntity, number][]>(
        PackagingMessagePatterns.PRELIMINARY,
        props
      )
    );
    return entities.map(([entity, amount]) => [
      toPackagingDto(entity) as PackagingDto,
      amount,
    ]);
  }

  async findAll(
    props: FindAllPackagingProps
  ): Promise<PaginatedData<PackagingDto>> {
    const result = await firstValueFrom(
      this.entityManagementService.send<PaginatedData<PackagingEntityList>>(
        PackagingMessagePatterns.READ,
        props
      )
    );
    return {
      data: result.data.map((entity) => toPackagingDtoList(entity)),
      meta: result.meta,
    };
  }

  async update(props: UpdatePackagingProps): Promise<PackagingDto> {
    const entity = await firstValueFrom(
      this.entityManagementService.send<PackagingEntity>(
        PackagingMessagePatterns.UPDATE,
        props
      )
    );
    return toPackagingDto(entity);
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
