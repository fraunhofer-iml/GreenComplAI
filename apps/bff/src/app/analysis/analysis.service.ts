/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AmqpClientEnum,
  AnalysisMessagePatterns,
  AnalysisQuery,
} from '@ap2/amqp';
import { InFlowAnalysisDto, WasteFlowAnalysisDto } from '@ap2/api-interfaces';
import { lastValueFrom } from 'rxjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AnalysisService {
  private readonly logger: Logger = new Logger(AnalysisService.name);

  constructor(
    @Inject(AmqpClientEnum.QUEUE_ENTITY_MANAGEMENT)
    private readonly entityManagementService: ClientProxy
  ) {}

  getWasteFlowAnalysis(query: AnalysisQuery): Promise<WasteFlowAnalysisDto> {
    return lastValueFrom(
      this.entityManagementService.send<WasteFlowAnalysisDto>(
        AnalysisMessagePatterns.GET_WASTE_FLOW_ANALYSIS,
        query
      )
    );
  }

  getInFlowAnalysis(query: AnalysisQuery): Promise<InFlowAnalysisDto> {
    return lastValueFrom(
      this.entityManagementService.send<InFlowAnalysisDto>(
        AnalysisMessagePatterns.GET_IN_FLOW_ANALYSIS,
        query
      )
    );
  }
}
