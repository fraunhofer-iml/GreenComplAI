/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenericInFlowAnalysisDto,
  InFlowAnalysisDto,
} from '@ap2/api-interfaces';
import * as echarts from 'echarts';
import { EChartsOption, PieSeriesOption } from 'echarts';
import moment, { Moment } from 'moment';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { Component, inject, input } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { SkalaTheme } from '../../../../styles/chart-theme';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import {
  getDefaultOption,
  getDefaultPieSeries,
} from '../chart-options/pie-chart-options';

@Component({
  selector: 'app-inflow-analysis-graph',
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './inflow-analysis-graph.component.html',
})
export class InflowAnalysisGraphComponent {
  private readonly analysisService = inject(AnalysisService);

  from$ = input<Moment>(moment(new Date(2024, 0, 1)));
  to$ = input<Moment>(moment(new Date(2024, 0, 1)));
  productGroupId$ = input<string>('');
  productId$ = input<string>('');

  theme = SkalaTheme;

  analysisQuery = injectQuery(() => ({
    queryKey: [
      'inflow-analysis',
      this.from$(),
      this.to$(),
      this.productGroupId$(),
      this.productId$(),
    ],
    queryFn: async () => {
      const analysis =
        await this.analysisService.getInFlowAnalysisOfProductGroups(
          this.from$().year(),
          this.to$().year(),
          '',
          this.productGroupId$()
        );
      return this.toChartData(analysis);
    },
  }));

  toChartData(productGroupAnalysis: InFlowAnalysisDto): EChartsOption[] {
    if (productGroupAnalysis.amount === 0) return [];

    if (!this.productId$())
      return [
        ...this.getAmountChartsForProductGroup(productGroupAnalysis),
        ...this.getMaterialCharts(productGroupAnalysis),
      ];

    const productAnalysis = productGroupAnalysis.analysis.find(
      (analysis) => analysis.id === this.productId$()
    );
    if (productAnalysis && productAnalysis.amount > 0)
      return [
        ...this.getAmountChartsForProduct(productAnalysis),
        ...this.getMaterialCharts(productAnalysis),
      ];

    return [];
  }

  private getMaterialCharts(
    analysis: InFlowAnalysisDto | GenericInFlowAnalysisDto
  ): EChartsOption[] {
    const rareEarths = this.createChartOption(
      'Eingekaufte seltene Erden',
      analysis.rareEarths,
      'kg'
    );
    const packaging = this.createChartOption(
      'Eingekaufte Verpackungen',
      analysis.packagings,
      'stk'
    );
    const materials = this.createChartOption(
      'Eingekaufte Materialien',
      analysis.materials,
      'kg'
    );
    const criticalRawMaterials = this.createChartOption(
      'Eingekaufte kritische Rohstoffe',
      analysis.criticalMaterials,
      'kg'
    );
    return [packaging, rareEarths, materials, criticalRawMaterials];
  }

  private getAmountChartsForProductGroup(
    analysis: InFlowAnalysisDto
  ): EChartsOption[] {
    const amount = this.createChartOption(
      'Eingekaufte Produkte',
      analysis.analysis.map((item) => [item.name, item.amount]),
      'stk'
    );
    const water = this.createChartOption(
      'Verwendetes Wasser',
      analysis.analysis.map((item) => [item.name, item.water]),
      'l'
    );

    return [water, amount];
  }

  private getAmountChartsForProduct(
    analysis: GenericInFlowAnalysisDto
  ): EChartsOption[] {
    const amount = this.createChartOption(
      'Eingekaufte Produkte',
      [[analysis.name, analysis.amount]],
      'stk'
    );

    const water = this.createChartOption(
      'Verwendetes Wasser',
      [[analysis.name, analysis.water]],
      'l'
    );

    return [amount, water];
  }

  private createChartOption(
    title: string,
    data: [string, number][],
    unit?: string
  ): EChartsOption {
    const chartOption: EChartsOption = getDefaultOption(true, unit);
    chartOption.title = { text: title };
    chartOption.legend = {
      ...chartOption.legend,
      textStyle: {
        color: '#fff',
        overflow: 'truncate',
        width: '200',
      },
    };

    if (data.length === 0) chartOption.title.subtext = 'Keine Daten';
    else {
      const tmpSeries: PieSeriesOption = getDefaultPieSeries();
      tmpSeries.data = data.map((material) => ({
        value: +material[1].toFixed(2),
        name: material[0],
      }));
      chartOption.series = [tmpSeries];
    }

    return chartOption;
  }
}
