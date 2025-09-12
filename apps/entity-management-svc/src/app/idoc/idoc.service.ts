/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProductCreateDto, ProductDto,
} from '@ap2/api-interfaces';
import { XMLParser } from 'fast-xml-parser';
import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from '../products/products.service';


@Injectable()
export class IdocService {
  private readonly logger: Logger = new Logger(IdocService.name);

  constructor(
    private readonly productService: ProductService,
  ) {}

  async createProductFromIdocRaw(
    idoc: string,
    userId: string
  ): Promise<ProductDto> {

    const parser = new XMLParser({
      ignoreAttributes: false, // sonst gehen dir Attribute wie SEGMENT verloren
      parseTagValue: true, // wandelt Strings automatisch in Zahlen/Booleans wo sinnvoll
      trimValues: true,
    });

    const parsed = parser.parse(idoc);

    this.logger.log(`[IdocService] Parsed IDoc: ${JSON.stringify(parsed, null, 2)}`);
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

    this.logger.log(`[IdocService] Name: ${name}, Description: ${description}`);

    // Produkt-DTO zusammenbauen
    const dto = new ProductCreateDto(name);

    dto.productId = maram.MATNR;
    dto.category = maram.MATKL ? String(maram.MATKL) : undefined;
    dto.unit = marm.MEINH ?? maram.MEINS;
    dto.gtin = marm.EAN11 ? String(marm.EAN11) : undefined;
    dto.price = mbewm.STPRS ? Math.round(parseFloat(mbewm.STPRS)) : undefined; // Int
    dto.productionLocation = marcm.WERKS ? String(marcm.WERKS) : undefined; // aber muss später via relation auf Address gemappt werden
    dto.description = description;

    dto.productionLocation = marcm.WERKS?.toString() ?? 'UNKNOWN';
    dto.warehouseLocation = marcm.LGORT?.toString() ?? 'UNKNOWN';

    this.logger.log('[IdocService] ProductCreateDto:', dto);

    const product = await this.productService.create({
      dto: dto,
      outlierDetectionResult: []
    })

    return product;
  }
}
