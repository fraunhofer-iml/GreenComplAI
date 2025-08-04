/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EChartsOption, PieSeriesOption } from 'echarts';

/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

//Chart colours get overridden by the SkalaTheme (see styles/chart-theme.ts)

export const getDefaultOption = (
  legendItemsSelectable: boolean,
  unit?: string
): EChartsOption => {
  return {
    title: {},
    tooltip: {
      trigger: 'item',
      formatter: `{b}:<br/> {c} ${unit ? `${unit}` : ''}`,
    },
    legend: {
      bottom: '0',
      left: '0',
      show: true,
      textStyle: {
        color: '#fff',
      },
      selectedMode: legendItemsSelectable,
    },
    series: [],
  };
};

export const getDefaultPieSeries = (): PieSeriesOption => {
  return {
    type: 'pie',
    radius: ['40%', '90%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 4,
      borderColor: '#2e3130',
      borderWidth: 1,
    },
    label: { position: 'inside', formatter: '{d}%' },
    labelLine: {
      show: false,
    },
    data: [{ value: 0, name: '' }],
  };
};
