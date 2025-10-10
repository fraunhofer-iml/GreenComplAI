/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BaseSubmodule {
  id: string;
  name: string;
  description: string;
}

export interface ProductIdentificationSubmodule extends BaseSubmodule {
  uniqueProductIdentifier: string;
  gtin?: string;
  taricCode?: string;
  supplier?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  importerIsSupplier?: boolean;
  importer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}
export type ProductIdentificationSubmoduleKeys =
  keyof ProductIdentificationSubmodule;
export const PRODUCT_IDENTIFICATION_KEYS: ProductIdentificationSubmoduleKeys[] =
  [
    'uniqueProductIdentifier',
    'gtin',
    'taricCode',
    'supplier',
    'importerIsSupplier',
    'importer',
  ];

export interface LegalComplianceSubmodule extends BaseSubmodule {
  technicalDocumentation: {
    certificates: string[];
    technicalDocuments: string[];
    legalDocuments: string[];
  };
  safetyInformation?: string[];
}

export const LEGAL_COMPIANCE_KEYS: (keyof LegalComplianceSubmodule)[] = [
  'technicalDocumentation',
  'safetyInformation',
];

export interface MaterialCompositionSubmodule extends BaseSubmodule {
  totalWeight: number;
  materials: {
    name: string;
    weight: number;
    percentage: number;
    isRenewable?: boolean;
    isPrimary?: boolean;
    isCritical?: boolean;
  }[];
}

export interface PackagingSubmodule extends BaseSubmodule {
  totalWeight: number;
  packagingMaterials: {
    name: string;
    weight: number;
    isRenewable?: boolean;
    isPrimary?: boolean;
  }[];
}

export interface CircularPropertiesSubmodule extends BaseSubmodule {
  concerningSubstances?: string[];
  disassemblyInstructions?: string[];
  repairabilityScore?: number;
}

export const CIRCILAR_PROPERTIES_KEYS: (keyof CircularPropertiesSubmodule)[] = [
  'concerningSubstances',
  'disassemblyInstructions',
  'repairabilityScore',
];

export interface ESRSynergiesSubmodule extends BaseSubmodule {
  productCarbonFootprint?: number;
  waterFootprint?: number;
  socialAspects?: string[];
}

export const ESR_SYNERGIES_KEYS: (keyof ESRSynergiesSubmodule)[] = [
  'productCarbonFootprint',
  'waterFootprint',
  'socialAspects',
];

export interface UsagePhaseSubmodule extends BaseSubmodule {
  usageInstructions?: string[];
}

export interface DPPSubmodules {
  productIdentification: ProductIdentificationSubmodule;
  legalCompliance: LegalComplianceSubmodule;
  materialComposition: MaterialCompositionSubmodule;
  packaging: PackagingSubmodule;
  circularProperties: CircularPropertiesSubmodule;
  esrSynergies: ESRSynergiesSubmodule;
  usagePhase: UsagePhaseSubmodule;
}

export type SubmoduleType = keyof DPPSubmodules;
