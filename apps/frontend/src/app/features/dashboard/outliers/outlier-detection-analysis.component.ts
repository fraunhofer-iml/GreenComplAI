/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OutlierDetectionAnalysisDto } from '@ap2/api-interfaces';
import { EChartsOption, PieSeriesOption } from 'echarts';
import * as echarts from 'echarts';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { SkalaTheme } from '../../../../styles/chart-theme';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import {
  getDefaultOption,
  getDefaultPieSeries,
} from '../chart-options/pie-chart-options';

@Component({
  selector: 'app-outlier-detection-analysis',
  imports: [CommonModule, NgxEchartsDirective, RouterModule, MatTooltipModule],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './outlier-detection-analysis.component.html',
})
export class OutlierDetectionAnalysisComponent {
  private readonly analysisService = inject(AnalysisService);

  productGroupId$ = input<string>('');
  productId$ = input<string>('');

  isOutlier = false;
  theme = SkalaTheme;

  analysisQuery = injectQuery(() => ({
    queryKey: ['outlier-analysis', this.productGroupId$(), this.productId$()],
    queryFn: async () => {
      const analysis = await this.analysisService.getOutlierAnalysis(
        this.productGroupId$()
      );
      return this.toChartData(analysis);
    },
  }));

  toChartData(analysis: OutlierDetectionAnalysisDto): EChartsOption {
    if (this.productId$()) {
      const outlier = analysis.outliesByItem.find(
        (item) => item.id === this.productId$()
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
    data: [string, number][]
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
