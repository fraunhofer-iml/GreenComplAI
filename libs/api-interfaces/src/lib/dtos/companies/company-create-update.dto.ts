/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto } from '../address';

export class CompanyCreateDto {
  name: string;
  email: string;
  phone: string;
  addresses: AddressDto[];
  flags: string[];

  constructor(
    name: string,
    email: string,
    phone: string,
    addresses: AddressDto[],
    flags: string[]
  ) {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.addresses = addresses;
    this.flags = flags;
  }
}
