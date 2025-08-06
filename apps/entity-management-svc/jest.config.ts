/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export default {
  displayName: 'entity-management-svc',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  coverageReporters: [
    ['lcov', { projectRoot: __dirname }],
    'text',
    'text-summary',
  ],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!@keycloak/keycloak-admin-client|url-join|url-template|camelize-ts)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: './coverage',
};
