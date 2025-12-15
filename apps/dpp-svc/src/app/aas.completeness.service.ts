/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Injectable()
export class AasCompletenessService {
  private readonly logger: Logger = new Logger(AasCompletenessService.name);

  constructor(private readonly appService: AppService) {}

  async aasCompletenessCheck(aasIdentifier: string): Promise<number> {
    let hits = 0;
    const total = 13;

    const dpp = await this.appService.getDpp(aasIdentifier);
    if (!dpp) return 0;

    const find = (suffix: string) =>
      dpp.connectedSubmodels.find((sm) => sm.id.endsWith(suffix));

    const productIdentificationSubmodule = find('product_identification');
    if (productIdentificationSubmodule) {
      const uid = this.getValue(
        productIdentificationSubmodule,
        'uniqueProductIdentifier'
      );
      const gtin = this.getValue(productIdentificationSubmodule, 'gtin');
      const taric = this.getValue(productIdentificationSubmodule, 'taricCode');
      const importer = this.getValue(
        productIdentificationSubmodule,
        'importer'
      );

      if (uid) {
        hits++;
      }
      if (gtin) {
        hits++;
      }
      if (taric) {
        hits++;
      }
      if (importer) {
        hits++;
      }
    }

    const legalComplianceSubmodule = find('legal_compliance');
    if (legalComplianceSubmodule) {
      const docs = this.getValue(
        legalComplianceSubmodule,
        'technicalDocumentation'
      );
      if (docs) {
        hits++;
      }
    }

    const materialCompositionSubmodule = find('material_composition');
    if (materialCompositionSubmodule) {
      const totalWeight = this.getValue(
        materialCompositionSubmodule,
        'totalWeight'
      );
      if (totalWeight) {
        hits++;
      }

      const materials = this.getValue(
        materialCompositionSubmodule,
        'materials'
      );
      if (materials && Array.isArray(materials) && materials.length > 0) {
        const allHaveWeight = materials.every((m) => m.value?.weight);
        const allHaveRenewable = materials.every(
          (m) => m.value?.isRenewable !== undefined
        );
        const allHavePrimary = materials.every(
          (m) => m.value?.isPrimary !== undefined
        );

        if (allHaveWeight) {
          hits++;
        }
        if (allHaveRenewable) {
          hits++;
        }
        if (allHavePrimary) {
          hits++;
        }
      }
    }

    const packagingSubmodule = find('packaging');
    if (packagingSubmodule) {
      const totalWeight = this.getValue(packagingSubmodule, 'totalWeight');
      if (totalWeight) {
        hits++;
      }

      const pm = this.getValue(packagingSubmodule, 'packagingMaterials');
      if (pm && Array.isArray(pm) && pm.length > 0) {
        const allRenewable = pm.every(
          (m) => m.value?.isRenewable !== undefined
        );
        const allPrimary = pm.every((m) => m.value?.isPrimary !== undefined);

        if (allRenewable) {
          hits++;
        }
        if (allPrimary) {
          hits++;
        }
      }
    }

    const circularPropertiesSubmodule = find('circular_properties');
    if (circularPropertiesSubmodule) {
      const substances = this.getValue(
        circularPropertiesSubmodule,
        'concerningSubstances'
      );

      if (substances && substances.length > 0) {
        hits++;
      }
    }

    const score = hits / total;
    return Number(score.toFixed(2));
  }

  private findElement(
    elements: any[] | null | undefined,
    idShort: string
  ): any | undefined {
    if (!elements) return undefined;

    for (const el of elements) {
      if (el.idShort === idShort) return el;

      // Recursion through collections
      if (Array.isArray(el.value)) {
        const nested = this.findElement(el.value, idShort);
        if (nested) return nested;
      }
    }

    return undefined;
  }

  private getValue(submodel: any, idShort: string): any {
    const el = this.findElement(submodel.submodelElements, idShort);
    return el ? el.value : null;
  }
}
