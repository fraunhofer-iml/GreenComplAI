/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { EChartsOption, PieSeriesOption } from 'echarts';
import * as echarts from 'echarts';

import {
  getDefaultOption,
  getDefaultPieSeries,
} from '../chart-options/pie-chart-options';
import { OutlierDetectionAnalysisDto } from '@ap2/api-interfaces';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { SkalaTheme } from '../../../../styles/chart-theme';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-outlier-detection-analysis',
  imports: [CommonModule, NgxEchartsDirective, RouterModule, MatTooltipModule],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './outlier-detection-analysis.component.html',
})
export class OutlierDetectionAnalysisComponent {
  productGroupId$ = input<string>('');
  productId$ = input<string>('');

  isOutlier = false;
  theme = SkalaTheme;

  constructor(private readonly analysisService: AnalysisService) {}

  analysisQuery = injectQuery(() => ({
    queryKey: ['outlier-analysis', this.productGroupId$(), this.productId$()],
    queryFn: async () => {
      const analysis = await this.analysisService.getOutlierAnalysis(
        this.productGroupId$(),
      );
      return this.toChartData(analysis);
    },
  }));

  toChartData(analysis: OutlierDetectionAnalysisDto): EChartsOption {
    if (this.productId$()) {
      const outlier = analysis.outliesByItem.find(
        (item) => item.id === this.productId$(),
      )?.numberOfOutliers;
      this.isOutlier = !!outlier;
    }

    return this.createChartOption('', [
      ['erkannte Ausreißer', analysis.totalNumberOfOutliers],
      [
        'validierte Produkte',
        analysis.totalNumberOfProducts - analysis.totalNumberOfOutliers,
      ],
    ]);
  }

  private createChartOption(
    title: string,
    data: [string, number][],
  ): EChartsOption {
    const chartOption: EChartsOption = getDefaultOption(true);
    chartOption.title = { text: title };
    chartOption.legend = {
      orient: 'vertical',
      right: 0,
      top: 'center',
      textStyle: {
        color: '#fff',
      },
    };

    if (data.length === 0) chartOption.title.subtext = 'Keine Daten';
    else {
      const tmpSeries: PieSeriesOption = getDefaultPieSeries();
      tmpSeries.center = ['30%', '50%'];
      tmpSeries.data = data.map((material) => ({
        value: +material[1].toFixed(2),
        name: material[0],
      }));
      chartOption.series = tmpSeries;
    }

    return chartOption;
  }
}
