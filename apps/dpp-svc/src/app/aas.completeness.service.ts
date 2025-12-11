/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import {
  CircularPropertiesSubmodule,
  LegalComplianceSubmodule,
  MaterialCompositionSubmodule,
  PackagingSubmodule,
  ProductIdentificationSubmodule,
} from './submodules';

@Injectable()
export class AasCompletenessService {
  private readonly logger: Logger = new Logger(AasCompletenessService.name);

  constructor(private readonly appService: AppService) {}

  async aasCompletenessCheck(aasIdentifier: string): Promise<number> {
    let hits = 0;
    const dpp = await this.appService.getDpp(aasIdentifier);
    if (!dpp) return 0;

    // --- 1. ProductIdentificationSubmodule ---
    const pid = dpp.connectedSubmodels.find((sm) =>
      sm.id.endsWith('product_identification')
    );
    if (pid) {
      const sub = pid as unknown as ProductIdentificationSubmodule;
      if (sub.uniqueProductIdentifier) hits++;
      if (sub.gtin) hits++;
      if (sub.taricCode) hits++;
      if (sub.importer) hits++;
    }

    // --- 2. LegalComplianceSubmodule ---
    const lc = dpp.connectedSubmodels.find((sm) =>
      sm.id.endsWith('legal_compliance')
    );
    if (lc) {
      const sub = lc as unknown as LegalComplianceSubmodule;
      if (sub.technicalDocumentation.certificates?.length) hits++;
      if (sub.technicalDocumentation.technicalDocuments?.length) hits++;
      if (sub.technicalDocumentation.legalDocuments?.length) hits++;
    }

    // --- 3. MaterialCompositionSubmodule ---
    const mc = dpp.connectedSubmodels.find((sm) =>
      sm.id.endsWith('material_composition')
    );
    if (mc) {
      const sub = mc as unknown as MaterialCompositionSubmodule;
      if (sub.totalWeight) hits++;

      if (sub.materials && sub.materials.length) {
        let materialHits = 0;
        for (const m of sub.materials) {
          if (m.weight != null) materialHits++;
          if (m.isRenewable != null) materialHits++;
          if (m.isPrimary != null) materialHits++;
        }
        hits += Math.min(3, materialHits);
      }
    }

    // --- 4. PackagingSubmodule ---
    const pkg = dpp.connectedSubmodels.find((sm) =>
      sm.id.endsWith('packaging')
    );
    if (pkg) {
      const sub = pkg as unknown as PackagingSubmodule;
      if (sub.totalWeight) hits++;

      if (sub.packagingMaterials && sub.packagingMaterials.length) {
        let packagingHits = 0;
        for (const p of sub.packagingMaterials) {
          if (p.isRenewable != null) packagingHits++;
          if (p.isPrimary != null) packagingHits++;
        }
        hits += Math.min(2, packagingHits);
      }
    }

    // --- 5. CircularPropertiesSubmodule ---
    const cp = dpp.connectedSubmodels.find((sm) =>
      sm.id.endsWith('circular_properties')
    );
    if (cp) {
      const sub = cp as unknown as CircularPropertiesSubmodule;
      if (sub.concerningSubstances?.length) hits++;
    }

    return hits / 15;
  }
}
