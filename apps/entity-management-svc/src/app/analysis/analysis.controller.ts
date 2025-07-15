/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalysisMessagePatterns, AnalysisQuery } from '@ap2/amqp';
import { InFlowAnalysisDto, WasteFlowAnalysisDto } from '@ap2/api-interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InFlowAnalysisService } from './in-flow-analysis.service';
import { WasteFlowAnalysisService } from './waste-flow-analysis.service';
import { ProductAnalysisService } from '../products/analysis.service';

@Controller()
export class AnalysisController {
  constructor(
    private readonly wasteFlowAnalysisService: WasteFlowAnalysisService,
    private readonly inFlowAnalysisService: InFlowAnalysisService,
    private readonly productAnalysisService: ProductAnalysisService,
  ) {}

  @MessagePattern(AnalysisMessagePatterns.GET_WASTE_FLOW_ANALYSIS)
  getWasteFlowAnalysis(
    @Payload()
    payload: AnalysisQuery
  ): Promise<WasteFlowAnalysisDto> {
    return this.wasteFlowAnalysisService.getWasteFlowAnalysis(payload);
  }

  @MessagePattern(AnalysisMessagePatterns.GET_IN_FLOW_ANALYSIS)
  getIFlowAnalysis(
    @Payload()
    payload: AnalysisQuery
  ): Promise<InFlowAnalysisDto> {
    return this.inFlowAnalysisService.getInFlowAnalysis(payload);
  }

  @MessagePattern(AnalysisMessagePatterns.GET_OUTLIER_ANALYSIS)
  getOutlierAnalysis(
    @Payload()
    payload: {
      productGroupId?: string;
    },
  ) {
    return this.productAnalysisService.getOutlierAnalysis(
      payload.productGroupId,
    );
  }
}
