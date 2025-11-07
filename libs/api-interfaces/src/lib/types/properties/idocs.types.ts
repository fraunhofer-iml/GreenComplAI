/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

export type CreateProductFromIdocRawProps = {
  userId: string;
  idoc: string;
};

export interface E1MARAM {
  MATNR: string; // Material number
  ERSDA?: string; // Created on
  ERNAM?: string; // Created by
  LAEDA?: string; // Changed on
  AENAM?: string; // Changed by
  VPSTA?: string;
  MTART?: string; // Material type
  MBRSH?: string;
  MATKL?: string; // Material group
  MEINS?: string; // Base unit
  BRGEW?: string; // Gross weight
  LAENG?: string;
  BREIT?: string;
  HOEHE?: string;
}

export interface E1MAKTM {
  SPRAS: string; // Language key
  MAKTX: string; // Description text
}

export interface E1MARM {
  MATNR?: string;
  MEINH?: string; // Unit of measure
  EAN11?: string; // GTIN
  UMREZ?: string;
  UMREN?: string;
}

export interface E1MARCM {
  MATNR?: string;
  WERKS?: string; // Plant
  LGORT?: string; // Storage location
  DISMM?: string;
  BESKZ?: string;
  MINBE?: string;
}

export interface E1MBEWM {
  MATNR?: string;
  BWKEY?: string;
  STPRS?: string; // Standard price
  PEINH?: string;
  VPRSV?: string;
  LBKUM?: string; // Stock quantity
  BDATJ?: string; // Year
}

export interface E1MLGNM {
  MATNR?: string;   // Material number
  LGNUM?: string;   // Warehouse number
  LGORT?: string;   // Storage location
  LGTYP?: string;   // Storage type
  LGPLA?: string;   // Storage bin
}

export interface E1MARDM {
  MATNR?: string;   // Material number
  WERKS?: string;   // Plant
  LGORT?: string;   // Storage location
  LABST?: string;   // Unrestricted stock
  INSME?: string;   // Stock in quality inspection
  SPEME?: string;   // Special stock
}

export interface IdocMatmas05 {
  EDI_DC40?: Record<string, string>;
  E1MARAM?: E1MARAM[];
  E1MAKTM?: E1MAKTM[];
  E1MARM?: E1MARM[];
  E1MARCM?: E1MARCM[];
  E1MBEWM?: E1MBEWM[];
  E1MLGNM?: E1MLGNM[];
  E1MARDM?: E1MARDM[];
}
