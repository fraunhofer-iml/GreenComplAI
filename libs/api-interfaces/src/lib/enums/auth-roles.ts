/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AuthRoles {
  SUSTAINABILITY_MANAGER = 'ap2_sustainability_manager',
  BUYER = 'ap2_buyer',
  CHIEF_EXECUTIVE_OFFICER = 'ap2_chief_executive_officer',
  DISPOSAL_LOGISTICS_SPECISALIST = 'ap2_disposal_logistics_specialist',
  PACKAGING_LOGISTICS_SPECISALIST = 'ap2_packaging_logistics_specialist',
  PRODUCTION_MANAGER = 'ap2_production_manager',
  SUPPLIER = 'ap2_supplier',
}

export function getRealmRole(role: AuthRoles) {
  return `realm:${role}`;
}
