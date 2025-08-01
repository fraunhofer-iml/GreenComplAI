/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarSeriesOption, EChartsOption } from 'echarts';

//Chart colours get overridden by the SkalaTheme (see styles/chart-theme.ts)
export const getBarChartOptions = (data: string[]): EChartsOption => {
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: { containLabel: true, left: 0, bottom: '4%', right: 0, top: 16 },
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      axisLabel: { color: '#fff' },
      data: data,
    },
    series: [],
  };
  return option;
};

export const getDefaultSeries = (name: string): BarSeriesOption => {
  return {
    name: name,
    type: 'bar',
    stack: 'total',
    emphasis: {
      focus: 'series',
    },
    tooltip: {
      trigger: 'item',
      position: { right: 'center', top: 0 },
      formatter: '{b} <br> {a}: {c} kg',
    },
    itemStyle: {
      borderRadius: 4,
      borderColor: 'transparent',
      borderWidth: 2,
    },
    data: [],
  };
};
