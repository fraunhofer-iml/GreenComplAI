/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentType =
  | 'CERTIFICATE'
  | 'INSTRUCTIONS'
  | 'TECHNICAL_DOCUMENTATION'
  | 'LEGAL_DOCUMENTS'
  | 'SAFETY_INFORMATION'
  | 'MISC';

export const documentTypeToLabel: Record<DocumentType, string> = {
  CERTIFICATE: 'Zertifikate und Nachweise',
  INSTRUCTIONS: 'Bedienungs- & Montageanleitungen',
  TECHNICAL_DOCUMENTATION: 'Technische Unterlagen',
  LEGAL_DOCUMENTS: 'Rechtliche Dokumente',
  SAFETY_INFORMATION: 'Sicherheitsinformationen & Warnhinweise',
  MISC: 'Sonstige Dokumente',
};
