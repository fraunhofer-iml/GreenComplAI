/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CircularPropertiesSubmoduleDto } from './circular-properties-submodule.dto';
import { ESRSynergiesSubmoduleDto } from './esr-synergies-submodule.dto';
import { LegalComplianceSubmoduleDto } from './legal-compliance-submodule.dto';
import { MaterialCompositionSubmoduleDto } from './material-composition-submodule.dto';
import { PackagingSubmoduleDto } from './packaging-submodule.dto';
import { ProductIdentificationSubmoduleDto } from './product-identification-submodule.dto';
import { UsagePhaseSubmoduleDto } from './usage-phase-submodule.dto';

export interface AasDto {
  id: string;
  idShort?: string;
  assetInformation?: {
    assetKind: string;
    globalAssetId?: string;
    specificAssetIds?: string[];
  };
  submodels: {
    productIdentification: ProductIdentificationSubmoduleDto;
    legalCompliance: LegalComplianceSubmoduleDto;
    materialComposition: MaterialCompositionSubmoduleDto;
    packaging: PackagingSubmoduleDto;
    circularProperties: CircularPropertiesSubmoduleDto;
    esrSynergies: ESRSynergiesSubmoduleDto;
    usagePhase: UsagePhaseSubmoduleDto;
  };
  administration?: {
    version?: string;
    revision?: string;
  };
  description?: string[];
  displayName?: string[];
  category?: string;
  tags?: string[];
  extensions?: any[];
  derivedFrom?: string;
  asset?: string;
  submodel?: string[];
  conceptDictionary?: string[];
}
