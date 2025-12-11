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

    // --------------------------------------------
    // PRODUCT IDENTIFICATION
    // --------------------------------------------
    const pid = find('product_identification');
    if (pid) {
      const uid = this.getValue(pid, 'uniqueProductIdentifier');
      const gtin = this.getValue(pid, 'gtin');
      const taric = this.getValue(pid, 'taricCode');
      const importer = this.getValue(pid, 'importer');

      if (uid){
        this.logger.debug(
          `Found uniqueProductIdentifier in submodel product_identification`
        );
        hits++;
      }
      if (gtin) {
        this.logger.debug(`Found gtin in submodel product_identification`);
        hits++;
      }
      if (taric) {
        this.logger.debug(
          `Found taricCode in submodel product_identification`
        );
        hits++;
      }
      if (importer) {
        this.logger.debug(`Found importer in submodel product_identification`);
        hits++;
      }
    }

    // --------------------------------------------
    // LEGAL COMPLIANCE
    // --------------------------------------------
    const lc = find('legal_compliance');
    if (lc) {
      const docs = this.getValue(pid, 'technicalDocumentation');
      if (docs) {
        this.logger.debug(
          `Found technicalDocumentation in submodel legal_compliance`
        );
        hits++;
      }
    }

    // --------------------------------------------
    // MATERIAL COMPOSITION
    // --------------------------------------------
    const mc = find('material_composition');
    if (mc) {
      const totalWeight = this.getValue(mc, 'totalWeight');
      if (totalWeight) {
        this.logger.debug(
          `Found totalWeight in submodel material_composition`
        );
        hits++;
      }

      const materials = this.getValue(mc, 'materials');
      if (materials && Array.isArray(materials) && materials.length > 0) {
        const allHaveWeight = materials.every((m) => m.value?.weight);
        const allHaveRenewable = materials.every(
          (m) => m.value?.isRenewable !== undefined
        );
        const allHavePrimary = materials.every(
          (m) => m.value?.isPrimary !== undefined
        );

        if (allHaveWeight) {
          this.logger.debug(
            `Found allHaveWeight in submodel material_composition`
          );
          hits++;
        }
        if (allHaveRenewable) {
          this.logger.debug(
            `Found allHaveRenewable in submodel material_composition`
          );
          hits++;
        }
        if (allHavePrimary) {
          this.logger.debug(
            `Found allHavePrimary in submodel material_composition`
          );
          hits++;
        }
      }
    }

    // --------------------------------------------
    // PACKAGING
    // --------------------------------------------
    const pkg = find('packaging');
    if (pkg) {
      const totalWeight = this.getValue(pkg, 'totalWeight');
      if (totalWeight) {
        this.logger.debug(`Found totalWeight in submodel packaging`);
        hits++;
      }

      const pm = this.getValue(pkg, 'packagingMaterials');
      if (pm && Array.isArray(pm) && pm.length > 0) {
        const allRenewable = pm.every(
          (m) => m.value?.isRenewable !== undefined
        );
        const allPrimary = pm.every((m) => m.value?.isPrimary !== undefined);

        if (allRenewable) {
          this.logger.debug(`Found allRenewable in submodel packaging`);
          hits++;
        }
        if (allPrimary) {
          this.logger.debug(`Found allPrimary in submodel packaging`);
          hits++;
        }
      }
    }

    // --------------------------------------------
    // CIRCULAR PROPERTIES
    // --------------------------------------------
    const cp = find('circular_properties');
    if (cp) {
      const substances = this.getValue(cp, 'concerningSubstances');

      if (substances && substances.length > 0) {
        this.logger.debug(
          `Found concerningSubstances in submodel circular_properties`
        );
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
