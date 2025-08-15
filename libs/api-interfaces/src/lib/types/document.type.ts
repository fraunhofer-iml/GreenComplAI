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
  | 'MISC';

export const documentTypeToLabel: Record<DocumentType, string> = {
  CERTIFICATE: 'Zertifikate und Nachweise',
  INSTRUCTIONS: 'Bedienungs- & Montageanleitungen',
  TECHNICAL_DOCUMENTATION: 'Technische Unterlagen',
  LEGAL_DOCUMENTS: 'Rechtliche Dokumente',
  MISC: 'Sonstige Dokumente',
};
