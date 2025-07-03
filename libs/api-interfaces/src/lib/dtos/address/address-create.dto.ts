/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export class AddressCreateDto {
  street: string;

  city: string;

  postalCode: string;

  country: string;

  constructor(
    street: string,
    city: string,
    postalCode: string,
    country: string
  ) {
    this.street = street;
    this.city = city;
    this.postalCode = postalCode;
    this.country = country;
  }
}
