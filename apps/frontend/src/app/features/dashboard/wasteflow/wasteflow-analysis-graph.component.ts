/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenericWasteFlowAnalysisDto,
  WasteFlowAnalysisDto,
} from '@ap2/api-interfaces';
import * as echarts from 'echarts';
import { BarSeriesOption, EChartsOption, SeriesOption } from 'echarts';
import * as moment from 'moment';
import { Moment } from 'moment';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { SkalaTheme } from '../../../../styles/chart-theme';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import {
  getBarChartOptions,
  getDefaultSeries,
} from '../chart-options/bar-chart-options';
import { getDefaultOption } from '../chart-options/pie-chart-options';

@Component({
  selector: 'app-wasteflow-analysis-graph',
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './wasteflow-analysis-graph.component.html',
})
export class WasteflowAnalysisGraphComponent {
  theme = SkalaTheme;

  from$ = input<Moment>(moment(new Date(2024, 0, 1)));
  to$ = input<Moment>(moment(new Date(2024, 0, 1)));
  productGroupId$ = input<string>('');
  productId$ = input<string>('');

  analysisQuery = injectQuery(() => ({
    queryKey: [
      'wasteflow-analysis',
      this.from$(),
      this.to$(),
      this.productGroupId$(),
      this.productId$(),
    ],
    queryFn: async () => {
      const analysis =
        await this.analysisService.getWasteFlowAnalysisOfProductGroups(
          this.from$().year(),
          this.to$().year(),
          this.productGroupId$()
        );

      return this.toChartData(analysis);
    },
  }));

  constructor(private readonly analysisService: AnalysisService) {}

  toChartData(analysis: WasteFlowAnalysisDto): {
    legend: EChartsOption;
    chartData: EChartsOption;
    analysis: WasteFlowAnalysisDto;
  } {
    const product = analysis.analysis.find((a) => a.id === this.productId$());
    const chart = getBarChartOptions(
      product ? [product.name] : analysis.analysis.map((a) => a.name)
    );

    const s: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (gefährliche Abfälle): Sonstiges'
    );
    s.data = this.productId$()
      ? [product?.hazardousWaste.utilizableWaste.miscellaneousWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.utilizableWaste.miscellaneousWeight
        );

    const s2: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (gefährliche Abfälle): Vorbereitungzu Wiederverwertung '
    );
    s2.data = this.productId$()
      ? [
          product?.hazardousWaste.utilizableWaste
            .preparationForRecyclingWeight ?? 0,
        ]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.utilizableWaste.preparationForRecyclingWeight
        );

    const s3: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (gefährliche Abfälle): Recycling '
    );
    s3.data = this.productId$()
      ? [product?.hazardousWaste.utilizableWaste.recyclingWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.utilizableWaste.recyclingWeight
        );

    const s4: BarSeriesOption = getDefaultSeries(
      'Beseitigung (gefährliche Abfälle): Sonstiges'
    );
    s4.data = this.productId$()
      ? [product?.hazardousWaste.nonUtilizableWaste.miscellaneousWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.nonUtilizableWaste.miscellaneousWeight
        );

    const s5 = getDefaultSeries(
      'Beseitigung (gefährliche Abfälle): Verbrennung'
    );
    s5.data = this.productId$()
      ? [product?.hazardousWaste.nonUtilizableWaste.combustionWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.nonUtilizableWaste.combustionWeight
        );

    const s6: BarSeriesOption = getDefaultSeries(
      'Beseitigung (gefährliche Abfälle): Deponierung'
    );
    s6.data = this.productId$()
      ? [product?.hazardousWaste.nonUtilizableWaste.landfillWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.hazardousWaste.nonUtilizableWaste.landfillWeight
        );

    const s7: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (nicht gefährliche Abfälle): Sonstiges'
    );
    s7.data = this.productId$()
      ? [product?.normalWaste.utilizableWaste.miscellaneousWeight ?? 0]
      : analysis.analysis.map(
          (a) => a.normalWaste.utilizableWaste.miscellaneousWeight
        );

    const s8: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (nicht gefährliche Abfälle): Vorbereitungzu Wiederverwertung'
    );
    s8.data = this.productId$()
      ? [product?.normalWaste.utilizableWaste.preparationForRecyclingWeight]
      : analysis.analysis.map(
          (a) => a.normalWaste.utilizableWaste.preparationForRecyclingWeight
        );

    const s9: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (nicht gefährliche Abfälle): Recycling'
    );
    s9.data = this.productId$()
      ? [product?.normalWaste.utilizableWaste.recyclingWeight]
      : analysis.analysis.map(
          (a) => a.normalWaste.utilizableWaste.recyclingWeight
        );

    const s10: BarSeriesOption = getDefaultSeries(
      'Beseitigung (nicht gefährliche Abfälle): Sonstiges'
    );
    s10.data = this.productId$()
      ? [product?.normalWaste.nonUtilizableWaste.miscellaneousWeight]
      : analysis.analysis.map(
          (a) => a.normalWaste.nonUtilizableWaste.miscellaneousWeight
        );

    const s11: BarSeriesOption = getDefaultSeries(
      'Beseitigung (nicht gefährliche Abfälle): Verbrennung'
    );
    s11.data = this.productId$()
      ? [product?.normalWaste.nonUtilizableWaste.combustionWeight]
      : analysis.analysis.map(
          (a) => a.normalWaste.nonUtilizableWaste.combustionWeight
        );

    const s12: BarSeriesOption = getDefaultSeries(
      'Beseitigung (nicht gefährliche Abfälle): Deponierung'
    );
    s12.data = this.productId$()
      ? [product?.normalWaste.nonUtilizableWaste.landfillWeight]
      : analysis.analysis.map(
          (a) => a.normalWaste.nonUtilizableWaste.landfillWeight
        );

    chart.series = [s, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12];

    return {
      legend: this.getLegend(chart.series),
      chartData: chart,
      analysis: product ? this.getProductAnalysis(product) : analysis,
    };
  }

  private getLegend(series: SeriesOption[]): EChartsOption {
    const legend = getDefaultOption(false);
    legend.series = series.map((s) => ({
      data: [
        {
          name: s.name,
        },
      ],
      type: 'pie',
    }));

    return legend;
  }

  private getProductAnalysis(
    productAnalysis: GenericWasteFlowAnalysisDto
  ): WasteFlowAnalysisDto {
    return {
      hazardousNonUtilizableWasteWeight:
        productAnalysis.hazardousWaste.nonUtilizableWaste.combustionWeight +
        productAnalysis.hazardousWaste.nonUtilizableWaste.landfillWeight +
        productAnalysis.hazardousWaste.nonUtilizableWaste.combustionWeight,
      hazardousUtilizableWasteWeight:
        productAnalysis.hazardousWaste.utilizableWaste.miscellaneousWeight +
        productAnalysis.hazardousWaste.utilizableWaste
          .preparationForRecyclingWeight +
        productAnalysis.hazardousWaste.utilizableWaste.recyclingWeight,
      normalNonUtilizableWasteWeight:
        productAnalysis.normalWaste.nonUtilizableWaste.combustionWeight +
        productAnalysis.normalWaste.nonUtilizableWaste.landfillWeight +
        productAnalysis.normalWaste.nonUtilizableWaste.combustionWeight,
      normalUtilizableWasteWeight:
        productAnalysis.normalWaste.utilizableWaste.miscellaneousWeight +
        productAnalysis.normalWaste.utilizableWaste
          .preparationForRecyclingWeight +
        productAnalysis.normalWaste.utilizableWaste.recyclingWeight,
      totalWeight: productAnalysis.wasteWeight,
      totalWasteWeightNotRecyclable: productAnalysis.wasteWeightNotRecyclable,
    } as WasteFlowAnalysisDto;
  }
}
