/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TableProps } from './model/table-props.type';
import { ContentType } from './table-content-type.enum';

export const TABLE_PROPS: Map<string, TableProps> = new Map([
  [
    ContentType.COMPANIES,
    {
      columns: ['id', 'name', 'email', 'phone'],
      headers: ['Id', 'Name', 'E-Mail', 'Telefon'],
    },
  ],
  [
    ContentType.PRODUCTS,
    {
      columns: [
        'productId',
        'name',
        'description',
        'category',
        'weight',
        'unit',
        'price',
        'length',
        'width',
        'height',
        'percentageOfBiologicalMaterials',
      ],
      headers: [
        'Produkt-Id',
        'Name',
        'Beschreibung',
        'Kategorie',
        'Gewicht',
        'Einheit',
        'Preis',
        'Länge',
        'Breite',
        'Höhe',
        'Anteil an erneuerbaren Materialien',
      ],
    },
  ],
  [
    ContentType.PACKAGE,
    {
      columns: [
        'id',
        'name',
        'percentageOfRenewableMaterial',
        'percentageOfRecycledMaterial',
        'percentageOfRStrategies',
        'weight',
        'supplierId',
        'supplierName',
        'materials',
      ],
      headers: [
        'Id',
        'Name',
        'Anteil an erneuerbaren Materialien',
        'Anteil an recycelten Materialien',
        'Anteil an R-Strategien',
        'Gewicht',
        'Lieferanten-Id',
        'Lieferanten-Name',
        'Materialien',
      ],
    },
  ],
  [
    ContentType.PRODUCT_GROUPS,
    {
      columns: ['id', 'name', 'wasteFlow', 'amount'],
      headers: ['Id', 'Name', 'Relevante Abfallströme', 'Anzahl der Produkte'],
    },
  ],
  [
    ContentType.REPORTS,
    {
      columns: [
        'id',
        'evaluationYear',
        'assetsBusinessActivitiesEvaluated',
        'consultationsConducted',
        'numberOfStrategies',
        'numberOfMeasures',
        'numberOfGoals',
        'isFinalReport',
      ],
      headers: [
        'Id',
        'Berichtsjahr',
        'Wertschöpfungskette bewertet',
        'Konsultationen durchgeführt',
        'Strategien',
        'Maßnahmen',
        'Ziele',
        'Finalisiert',
      ],
    },
  ],
]);
