/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export const ONLY_YEAR_FORMAT = {
  parse: {
    dateInput: 'YYYY',
  },
  display: {
    dateInput: 'YYYY',
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'YYYY',
  },
};

export const MONTH_AND_YEAR_FORMAT = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'MMMM YYYY',
    monthYearLabel: 'MMMM YYYY',
  },
};
