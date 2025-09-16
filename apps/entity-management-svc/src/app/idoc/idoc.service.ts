/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductCreateDto, ProductDto } from '@ap2/api-interfaces';
import { XMLParser } from 'fast-xml-parser';
import { Injectable, Logger } from '@nestjs/common';
import { ProductService } from '../products/products.service';

@Injectable()
export class IdocService {
  private readonly logger: Logger = new Logger(IdocService.name);

  constructor(private readonly productService: ProductService) {}

  async createProductFromIdocRaw(
    idoc: string,
    userId: string
  ): Promise<ProductDto> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      trimValues: true,
      removeNSPrefix: true,
      allowBooleanAttributes: true,
      isArray: (tagName) => tagName.startsWith('E1'),
    });

    const parsed = parser.parse(idoc);

    this.logger.verbose(
      `[IdocService] Parsed IDoc: ${JSON.stringify(parsed, null, 2)}`
    );
    const idocObj = parsed?.IDOC;

    if (!idocObj) {
      throw new Error('Invalid IDoc: Missing <IDOC> root element');
    }

    // --- Extract segments ---
    const maram = idocObj.E1MARAM?.[0] ?? {}; // General material master data
    const maktm = idocObj.E1MAKTM ?? []; // Texts (name, description, language)
    const marm = idocObj.E1MARM?.[0] ?? {}; // Units of measure / GTIN
    const marcm = idocObj.E1MARCM?.[0] ?? {}; // Plant view
    const mbewm = idocObj.E1MBEWM?.[0] ?? {}; // Valuation (price)
    const mlgNm = idocObj.E1MLGNM?.[0] ?? {}; // Storage location
    const mardm = idocObj.E1MARDM?.[0] ?? {}; // Stock data

    // --- Extract name & description from MAKTM ---
    const name =
      maktm.find((m: any) => m.SPRAS === 'EN')?.MAKTX ??
      maktm[0]?.MAKTX ??
      'Unnamed product';

    const description =
      maktm.find((m: any) => m.SPRAS === 'DE')?.MAKTX ?? undefined;

    const dto = new ProductCreateDto(name);

    dto.productId = maram.MATNR;
    dto.category = maram.MATKL ? String(maram.MATKL) : undefined;
    dto.unit = marm.MEINH ?? maram.MEINS;
    dto.gtin = marm.EAN11 ? String(marm.EAN11) : undefined;

    // --- Price from valuation (STPRS = standard price) ---
    dto.price = mbewm.STPRS ? Math.round(parseFloat(mbewm.STPRS)) : undefined;

    // --- Plant + storage location ---
    dto.productionLocation = marcm.WERKS?.toString() ?? 'UNKNOWN';
    dto.warehouseLocation =
      marcm.LGORT?.toString() ?? mlgNm.LGORT?.toString() ?? 'UNKNOWN';

    // --- Weight from E1MARAM (BRGEW = gross weight) ---
    dto.weight = maram.BRGEW ? parseFloat(maram.BRGEW) : undefined;

    // --- Dimensions (length/width/height in E1MARAM) ---
    if (maram.LAENG || maram.BREIT || maram.HOEHE) {
      dto.dimensions = `${maram.LAENG ?? 'N/A'}x${maram.BREIT ?? 'N/A'}x${maram.HOEHE ?? 'N/A'}`;
    }

    // --- Example: production history from MBEWM (if year/period provided) ---
    if (mbewm.LBKUM && mbewm.BDATJ) {
      dto.productionHistory = [
        { amount: parseInt(mbewm.LBKUM), year: parseInt(mbewm.BDATJ) },
      ];
    }

    dto.description = description;

    this.logger.verbose('[IdocService] ProductCreateDto:', dto);

    const product = await this.productService.create({
      dto: dto,
      outlierDetectionResult: [],
    });

    return product;
  }
}
