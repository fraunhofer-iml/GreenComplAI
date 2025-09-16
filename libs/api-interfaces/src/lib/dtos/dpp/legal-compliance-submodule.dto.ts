/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseSubmoduleDto } from './base-submodule.dto';

export interface TechnicalDocumentationDto {
  certificates: string[]; // Zertifikate & Nachweise
  technicalDocuments: string[]; // Technische Unterlagen
  legalDocuments: string[]; // Rechtliche Dokumente
}

export interface LegalComplianceSubmoduleDto extends BaseSubmoduleDto {
  technicalDocumentation: TechnicalDocumentationDto;
  safetyInformation?: string[]; // Sicherheitsinformationen & Warnhinweise
}
