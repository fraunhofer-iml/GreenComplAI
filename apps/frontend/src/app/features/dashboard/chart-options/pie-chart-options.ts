/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EChartsOption, PieSeriesOption } from 'echarts';

export const getDefaultOption = (
  legendItemsSelectable: boolean
): EChartsOption => {
  return {
    title: { text: '' },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '0',
      left: '0',
      textStyle: {
        color: '#fff',
      },
      selectedMode: legendItemsSelectable,
    },
    series: [],
  };
};

export const getDefaultSeries = (): PieSeriesOption => {
  return {
    type: 'pie',
    radius: ['40%', '90%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 4,
      borderColor: '#2e3130',
      borderWidth: 1,
    },
    label: {
      show: false,
      position: 'center',
    },
    labelLine: {
      show: false,
    },
    data: [{ value: 0, name: '' }],
  };
};
