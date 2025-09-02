/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AddressDto, CompanyCreateDto, ProductDto } from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { XMLParser } from 'fast-xml-parser';
import {
  IUserManagementService,
  USER_MANAGEMENT_SERVICE_TOKEN,
} from '@greencomplai/user-management';
import { Inject, Injectable } from '@nestjs/common';
import { FlagsService } from '../flags/flags.service';

@Injectable()
export class IdocService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly flagsService: FlagsService,
    @Inject(USER_MANAGEMENT_SERVICE_TOKEN)
    private readonly userManagementService: IUserManagementService
  ) {}

  async createProductFromIdocRaw(
    idoc: string,
    userId: string
  ): Promise<ProductDto> {
    const evaluationElement = new CompanyCreateDto(
      '',
      '',
      '',
      [new AddressDto('', '', '', '')],
      []
    );

    const parser = new XMLParser({
      ignoreAttributes: false, // sonst gehen dir Attribute wie SEGMENT verloren
      parseTagValue: true, // wandelt Strings automatisch in Zahlen/Booleans wo sinnvoll
      trimValues: true,
    });

    const parsed = parser.parse(idoc);
    const idocObj = parsed?.IDOC;

    if (!idocObj) {
      throw new Error('Invalid IDoc: Missing <IDOC> root element');
    }

    // Segmente extrahieren
    const maram = idocObj.E1MARAM ?? {};
    const maktm = Array.isArray(idocObj.E1MAKTM)
      ? idocObj.E1MAKTM
      : [idocObj.E1MAKTM].filter(Boolean);
    const marm = idocObj.E1MARM ?? {};
    const marcm = idocObj.E1MARCM ?? {};
    const mbewm = idocObj.E1MBEWM ?? {};

    // Name & Description aus MAKTM
    const name =
      maktm.find((m: any) => m.SPRAS === 'EN')?.MAKTX ??
      maktm[0]?.MAKTX ??
      'Unnamed product';

    const description =
      maktm.find((m: any) => m.SPRAS === 'DE')?.MAKTX ?? undefined;

    // Produkt-DTO zusammenbauen
    const dto = new ProductCreateDto(name);

    dto.productId = maram.MATNR;
    dto.category = maram.MATKL;
    dto.unit = marm.MEINH ?? maram.MEINS;
    dto.gtin = marm.EAN11;
    dto.price = mbewm.STPRS ? parseFloat(mbewm.STPRS) : undefined;
    dto.productionLocation = marcm.WERKS;
    dto.description = description;

    // Flags für Nachvollziehbarkeit
    dto.flags = ['imported-from-idoc'];

    return dto;
  }
}
