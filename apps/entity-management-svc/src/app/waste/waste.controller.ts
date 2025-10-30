/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { WastePattern } from '@ap2/amqp';
import { WasteMaterialEntity } from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WasteService } from './waste.service';

@Controller()
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  @MessagePattern(WastePattern.GET_WASTE_MATERIAL)
  getWasteMaterial(@Payload() wasteId: string): Promise<WasteMaterialEntity[]> {
    return this.wasteService.findWasteMaterial(wasteId);
  }
}
