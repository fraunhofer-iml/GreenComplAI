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
import { ChartLegends } from '../../../shared/constants/chart-legends';
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
    console.log(analysis);

    if (this.productId$()) {
      const outlier = analysis.outliesByItem.find(
        (item) => item.id === this.productId$()
      )?.numberOfOutliers;
      this.isOutlier = !!outlier;
    }

    return this.createChartOption(
      '',
      [
        [ChartLegends.OUTLIERS, analysis.totalNumberOfOutliers],
        [
          ChartLegends.VALIDATED,
          analysis.totalNumberOfProducts - analysis.totalNumberOfOutliers,
        ],
      ],
      [
        ...analysis.outliesByItem.map(
          (item) =>
            ['Ausreißer ' + item.id, item.numberOfOutliers] as [string, number]
        ),
        ...analysis.outliesByItem.map(
          (item) =>
            [
              'Validiert ' + item.id,
              item.numberOfProducts - item.numberOfOutliers,
            ] as [string, number]
        ),
      ]
    );
  }

  private createChartOption(
    title: string,
    dataTotal: [string, number][],
    dataByItems: [string, number][]
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
      data: [ChartLegends.OUTLIERS, ChartLegends.VALIDATED],
    };

    if (dataTotal.length === 0) chartOption.title.subtext = 'Keine Daten';
    else {
      const outerPie: PieSeriesOption = getDefaultPieSeries(['60%', '90%']);
      outerPie.center = ['30%', '50%'];
      outerPie.label = { position: 'inside', formatter: '{c}' };
      outerPie.data = dataByItems.map((item) => {
        return {
          value: +item[1].toFixed(2),
          name: item[0],
        };
      });

      const innerPie: PieSeriesOption = getDefaultPieSeries([0, '50 %']);
      innerPie.center = ['30%', '50%'];
      innerPie.label = {
        position: 'inside',
        formatter: function (params) {
          const percent = params.percent?.toFixed(1);
          return `${percent}%`;
        },
      };
      innerPie.data = dataTotal.map((item) => {
        return {
          value: +item[1].toFixed(2),
          name: item[0],
        };
      });

      chartOption.series = [outerPie, innerPie];
    }

    return chartOption;
  }
}
