/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { UNITS } from './available-units';

export enum Messages {
  errorCompany = 'Dem Benutzer ist kein Unternehmen zugeordnet. Bitte legen Sie eine Firma an.',
  errorRemoveAddress = 'Es wird mindestens eine Adresse benötigt!',
  errorNoSupplierFound = 'Es wurden keine Lieferanten gefunden. Bitte legen Sie zuerst einen Lieferanten an.',
  errorNoGroupFound = 'Es wurden keine Produktgruppen gefunden. Bitte legen Sie zuerst einen Gruppe an.',
  errorForbidden = 'User hat keine Berechtigung.',
}

export enum TooltipMessages {
  tooltipEdit = 'Item wurde zum manuellen Editieren Markiert. Bitte lösen Sie alle markierten elemente auf.',
}

export const UNIT_INFO_MESSAGE = `Alle verfügbaren Einheiten sind: ${Array.from(
  UNITS
)
  .map((u) => ` ${u[1]}`)
  .toString()}. Andere Einheiten können nicht gespeichert werden, das Feld bleibt leer.`;
