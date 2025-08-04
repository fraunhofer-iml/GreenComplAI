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
import {
  getDefaultOption,
  getDefaultPieSeries,
} from '../chart-options/pie-chart-options';
import { OutlierDetectionAnalysisComponent } from '../outliers/outlier-detection-analysis.component';

@Component({
  selector: 'app-wasteflow-analysis-graph',
  imports: [
    CommonModule,
    NgxEchartsDirective,
    OutlierDetectionAnalysisComponent,
  ],
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
  legendChart: any;
  private chart: echarts.ECharts | undefined;

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

    const s1: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (gefährliche Abfälle): verwertbare Abfälle'
    );
    s1.data = this.productId$()
      ? [
          product?.hazardousWaste.utilizableWaste.miscellaneousWeight ?? 0,
          product?.hazardousWaste.utilizableWaste
            .preparationForRecyclingWeight ?? 0,
          product?.hazardousWaste.utilizableWaste.recyclingWeight ?? 0,
        ]
      : analysis.analysis.map((a) => {
          return {
            name: a.name,
            value:
              (a.hazardousWaste.utilizableWaste.miscellaneousWeight ?? 0) +
              (a.hazardousWaste.utilizableWaste.preparationForRecyclingWeight ??
                0) +
              (a.hazardousWaste.utilizableWaste.recyclingWeight ?? 0),
            child: [
              {
                name: 'Wertstoffkreislauf (gefährliche verwertbare Abfälle): Verschiedenes',
                value:
                  a.hazardousWaste.utilizableWaste.miscellaneousWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf verwertbare (gefährliche Abfälle) Vorbereitung zur Verwertung',
                value:
                  a.hazardousWaste.utilizableWaste
                    .preparationForRecyclingWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf verwertbare (gefährliche Abfälle): Recycling',
                value: a.hazardousWaste.utilizableWaste.recyclingWeight ?? 0,
              },
            ],
          };
        });

    const s2: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (gefährliche Abfälle): nicht verwertbare Abfälle'
    );
    s2.data = this.productId$()
      ? [
          (product?.hazardousWaste.nonUtilizableWaste.combustionWeight ?? 0) +
            (product?.hazardousWaste.nonUtilizableWaste.landfillWeight ?? 0) +
            (product?.hazardousWaste.nonUtilizableWaste.miscellaneousWeight ??
              0),
        ]
      : analysis.analysis.map((a) => {
          return {
            name: a.name,
            value:
              (a.hazardousWaste.nonUtilizableWaste.combustionWeight ?? 0) +
              (a.hazardousWaste.nonUtilizableWaste.landfillWeight ?? 0) +
              (a.hazardousWaste.nonUtilizableWaste.miscellaneousWeight ?? 0),
            child: [
              {
                name: 'Wertstoffkreislauf (gefährliche nicht verwertbare Abfälle): Verbrennung',
                value:
                  a.hazardousWaste.nonUtilizableWaste.combustionWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf (gefährliche nicht verwertbare Abfälle): Deponierung',
                value: a.hazardousWaste.nonUtilizableWaste.landfillWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf (gefährliche nicht verwertbare Abfälle): Sonstiges',
                value:
                  a.hazardousWaste.nonUtilizableWaste.miscellaneousWeight ?? 0,
              },
            ],
          };
        });

    const s3: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (nicht gefährliche Abfälle): verwertbare Abfälle'
    );
    s3.data = this.productId$()
      ? [
          (product?.normalWaste.utilizableWaste.miscellaneousWeight ?? 0) +
            (product?.normalWaste.utilizableWaste
              .preparationForRecyclingWeight ?? 0) +
            (product?.normalWaste.utilizableWaste.recyclingWeight ?? 0),
        ]
      : analysis.analysis.map((a) => {
          return {
            name: a.name,
            value:
              (a.normalWaste.utilizableWaste.miscellaneousWeight ?? 0) +
              (a.normalWaste.utilizableWaste.preparationForRecyclingWeight ??
                0) +
              (a.normalWaste.utilizableWaste.recyclingWeight ?? 0),
            child: [
              {
                name: 'Wertstoffkreislauf (nicht gefährliche verwertbare Abfälle): Verschiedenes',
                value: a.normalWaste.utilizableWaste.miscellaneousWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf (nicht gefährliche verwertbare Abfälle): Vorbereitung zur Verwertung',
                value:
                  a.normalWaste.utilizableWaste.preparationForRecyclingWeight ??
                  0,
              },
              {
                name: 'Wertstoffkreislauf (nicht gefährliche verwertbare Abfälle): Recycling',
                value: a.normalWaste.utilizableWaste.recyclingWeight ?? 0,
              },
            ],
          };
        });

    const s4: BarSeriesOption = getDefaultSeries(
      'Wertstoffkreislauf (nicht gefährliche Abfälle): nicht verwertbare Abfälle'
    );
    s4.data = this.productId$()
      ? [
          (product?.normalWaste.nonUtilizableWaste.combustionWeight ?? 0) +
            (product?.normalWaste.nonUtilizableWaste.landfillWeight ?? 0) +
            (product?.normalWaste.nonUtilizableWaste.miscellaneousWeight ?? 0),
        ]
      : analysis.analysis.map((a) => {
          return {
            name: a.name,
            value:
              (a.normalWaste.nonUtilizableWaste.combustionWeight ?? 0) +
              (a.normalWaste.nonUtilizableWaste.landfillWeight ?? 0) +
              (a.normalWaste.nonUtilizableWaste.miscellaneousWeight ?? 0),
            child: [
              {
                name: 'Wertstoffkreislauf (nicht gefährliche nicht verwertbare Abfälle): Verbrennung',
                value: a.normalWaste.nonUtilizableWaste.combustionWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf (nicht gefährliche nicht verwertbare Abfälle):  Deponierung',
                value: a.normalWaste.nonUtilizableWaste.landfillWeight ?? 0,
              },
              {
                name: 'Wertstoffkreislauf (nicht gefährliche nicht verwertbare Abfälle): Sonstiges',
                value:
                  a.normalWaste.nonUtilizableWaste.miscellaneousWeight ?? 0,
              },
            ],
          };
        });

    chart.series = [s1, s2, s3, s4];

    return {
      legend: this.getLegend(chart.series),
      chartData: chart,
      analysis: product ? this.getProductAnalysis(product) : analysis,
    };
  }

  onChartInit($event: any) {
    this.chart = $event;
    this.chart?.on('click', this.barChartClick.bind(this));
  }

  barChartClick(params: any) {
    if (!this.chart) return;

    const chartOptions = this.getChartOptions();
    const legendOptions = this.getLegendOptions();
    if (!chartOptions.series) return;

    const parentSeries = this.findParentSeries(
      chartOptions.series,
      params.seriesName
    );
    if (!parentSeries) return;

    const clickedItem = this.findClickedItem(parentSeries, params.name);
    if (!clickedItem?.child) return;

    const chartIndex = this.clearClickedItemValue(chartOptions.series, params);
    const legendIndex = this.removeLegendEntry(
      legendOptions,
      params.seriesName
    );

    clickedItem.child.forEach((child) => {
      this.insertPieSeries(legendOptions, child.name, legendIndex);
      this.insertBarSeries(
        chartOptions.series,
        parentSeries,
        params.name,
        child,
        chartIndex
      );
    });

    this.updateCharts(chartOptions, legendOptions);
  }

  private getChartOptions(): echarts.EChartsOption {
    return this.chart?.getOption() as echarts.EChartsOption;
  }

  private getLegendOptions(): echarts.EChartsOption {
    return this.legendChart.getOption();
  }

  private findParentSeries(seriesList: any, seriesName: string): SeriesOption {
    return seriesList.find((s: SeriesOption) => s.name === seriesName)?.data;
  }

  private findClickedItem(
    parentSeries: any,
    itemName: string
  ): { name: string; child?: { name: string; value: number }[] } | undefined {
    return parentSeries.find(
      (item: { name: string }) => item.name === itemName
    );
  }

  private clearClickedItemValue(seriesList: any, params: any): number {
    let chartIndex = 0;
    seriesList.forEach(
      (
        series: { name: string; data: { name: string; value: number }[] },
        i: number
      ) => {
        if (series.name === params.seriesName && series.data) {
          chartIndex = i;
          const j = series.data.findIndex(
            (item: { name: string }) => item.name === params.name
          );
          if (j !== -1) {
            (series.data[j] as { value: number }).value = 0;
          }
        }
      }
    );
    return chartIndex;
  }

  private removeLegendEntry(legendOptions: any, seriesName: string): number {
    let legendIndex = -1;
    legendOptions.series = legendOptions.series.filter(
      (el: { data: { name: string }[] }, i: number) => {
        if (el.data[0].name === seriesName) {
          legendIndex = i;
          return false;
        }
        return true;
      }
    );
    return legendIndex;
  }

  private insertPieSeries(
    legendOptions: any,
    childName: string,
    legendIndex: number
  ) {
    if (legendIndex < 0) return;
    const pieSeries = getDefaultPieSeries();
    pieSeries.data = [{ name: childName }];
    pieSeries.type = 'pie';
    legendOptions.series.splice(legendIndex, 0, pieSeries);
  }

  private insertBarSeries(
    seriesList: any,
    parentSeries: any,
    clickedName: string,
    child: { name: string; value: number },
    chartIndex: number
  ) {
    const newSeries = getDefaultSeries(child.name);
    newSeries.data = Array(parentSeries.length).fill(0);
    const itemIndex = parentSeries.findIndex(
      (item: { name: string }) => item.name === clickedName
    );
    if (itemIndex !== -1) {
      newSeries.data[itemIndex] = { name: clickedName, value: child.value };
    }
    seriesList.splice(chartIndex, 0, newSeries);
  }

  private updateCharts(
    chartOptions: echarts.EChartsOption,
    legendOptions: any
  ) {
    this.chart?.setOption(chartOptions, { notMerge: true });
    this.legendChart?.setOption(legendOptions, { notMerge: true });
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

  onChartLegendInit($event: any) {
    this.legendChart = $event;
  }
}
