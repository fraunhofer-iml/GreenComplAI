/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto } from '../address';

export class CompanyDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: AddressDto[];
  flags: string[];

  constructor(
    id: string,
    name: string,
    email: string,
    phone: string,
    addresses: AddressDto[],
    flags: string[]
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.addresses = addresses;
    this.flags = flags;
  }
}

export class CompanyCreateResponse {
  company: CompanyDto;
  username: string;

  constructor(company: CompanyDto, username: string) {
    this.company = company;
    this.username = username;
  }
}
