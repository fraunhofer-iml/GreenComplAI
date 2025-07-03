/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

const playwright = require('eslint-plugin-playwright');
const baseConfig = require('../../eslint.config.js');

module.exports = [
  playwright.configs['flat/recommended'],

  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    rules: {},
  },
];
