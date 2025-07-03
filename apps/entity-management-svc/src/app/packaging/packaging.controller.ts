/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingMessagePatterns } from '@ap2/amqp';
import {
  CreatePackagingProps,
  FindAllPackagingProps,
  PackagingDto,
  PackagingIdProps,
  PaginatedData,
  UpdatePackagingProps,
  UpdatePackagingWasteProps,
  UpdatePartPackagingProps,
} from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PackagingService } from './packaging.service';

@Controller('packaging')
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @MessagePattern(PackagingMessagePatterns.CREATE)
  create(
    @Payload() createPackagingDto: CreatePackagingProps
  ): Promise<PackagingDto> {
    return this.packagingService.create(createPackagingDto);
  }

  @MessagePattern(PackagingMessagePatterns.READ)
  findAll(
    @Payload() payload: FindAllPackagingProps
  ): Promise<PaginatedData<PackagingDto>> {
    return this.packagingService.findAll(payload);
  }

  @MessagePattern(PackagingMessagePatterns.READ_BY_ID)
  async findOne(@Payload() payload: PackagingIdProps): Promise<PackagingDto> {
    return this.packagingService.findOne(payload);
  }

  @MessagePattern(PackagingMessagePatterns.PRELIMINARY)
  async findPartPackagings(
    @Payload() payload: PackagingIdProps
  ): Promise<[PackagingDto, number][]> {
    return this.packagingService.findPartPackagings(payload);
  }
  @MessagePattern(PackagingMessagePatterns.UPDATE)
  update(@Payload() payload: UpdatePackagingProps): Promise<PackagingDto> {
    return this.packagingService.update(payload);
  }

  @MessagePattern(PackagingMessagePatterns.UPDATE_PART_PACKAGING)
  updatePartPackaging(
    @Payload() payload: UpdatePartPackagingProps
  ): Promise<void> {
    return this.packagingService.updatePartPackaging(payload);
  }
  @MessagePattern(PackagingMessagePatterns.UPDATE_WASTE)
  updatePackagingWaste(
    @Payload() payload: UpdatePackagingWasteProps
  ): Promise<void> {
    return this.packagingService.updateWaste(payload);
  }
  @MessagePattern(PackagingMessagePatterns.DELETE)
  remove(@Payload() payload: PackagingIdProps): Promise<void> {
    return this.packagingService.remove(payload);
  }
}
