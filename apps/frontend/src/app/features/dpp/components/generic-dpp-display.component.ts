/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  ISubmodelElement,
  LangStringNameType,
  LangStringTextType,
  Property,
  Submodel,
  SubmodelElementCollection,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

type DppResponse = AssetAdministrationShell & {
  connectedSubmodels: Submodel[];
};

@Component({
  selector: 'app-generic-dpp-display',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
  ],
  providers: [DecimalPipe],
  templateUrl: './generic-dpp-display.component.html',
  styles: [
    `
      .border-l-4 {
        border-left-width: 4px;
      }
    `,
  ],
})
export class GenericDppDisplayComponent {
  @Input() dppData: DppResponse | null = null;
  private readonly decimalPipe = inject(DecimalPipe);

  isProperty(element: ISubmodelElement): element is Property {
    return 'valueType' in (element as unknown as Record<string, unknown>);
  }

  isSubmodelElementCollection(
    element: ISubmodelElement
  ): element is SubmodelElementCollection {
    return !('valueType' in (element as unknown as Record<string, unknown>));
  }

  getDisplayText(
    displayNameArray:
      | Array<{ language: string; text: string }>
      | LangStringNameType[]
      | LangStringTextType[]
      | null
      | undefined
  ): string {
    const entries = (displayNameArray ?? []) as Array<{
      language: string;
      text: string;
    }>;
    if (entries.length === 0) return '';
    const german = entries.find((e) => e.language === 'de');
    return (german ?? entries[0]).text;
  }

  getSubmodelDisplayName(submodel: Submodel): string {
    if (submodel.displayName && submodel.displayName.length > 0) {
      return this.getDisplayText(submodel.displayName);
    }
    return submodel.idShort || 'Unbekannt';
  }

  getElementDisplayName(element: ISubmodelElement): string {
    if (element.displayName && element.displayName.length > 0) {
      return this.getDisplayText(element.displayName);
    }
    return element.idShort || 'Unbekannt';
  }

  getItemDisplayName(item: ISubmodelElement): string {
    if (item.displayName && item.displayName.length > 0) {
      return this.getDisplayText(item.displayName);
    }
    return item.idShort || 'Element';
  }

  formatPropertyName(key: string): string {
    const nameMap: { [key: string]: string } = {
      weight: 'Gewicht',
      percentage: 'Prozentsatz',
      isRenewable: 'Erneuerbar',
      isPrimary: 'Primär/Sekundär',
      isCritical: 'Kritisch',
      name: 'Name',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      value: 'Wert',
    };

    return nameMap[key] || key;
  }

  formatValue(value: unknown, hint: string | null): string {
    if (value === null || value === undefined) {
      return 'Kein Wert gespeichert';
    }
    const forced = this.forceValueType(value);

    // Booleans
    if (typeof forced === 'boolean') {
      if (hint === 'isRenewable')
        return forced ? 'Erneuerbar' : 'Nicht erneuerbar';
      if (hint === 'isPrimary') return forced ? 'Primär' : 'Sekundär';
      if (hint === 'isCritical') return forced ? 'Kritisch' : 'Nicht kritisch';
      return forced ? 'Ja' : 'Nein';
    }

    // Numbers with unit hints
    if (typeof forced === 'number') {
      const h = (hint ?? '').toLowerCase();
      const formatted =
        this.decimalPipe.transform(forced, '1.0-2') ?? String(forced);
      if (h.includes('weight')) return `${formatted} kg`;
      if (h.includes('percentage')) return `${formatted}%`;
      if (h.includes('waterfootprint') || h.includes('footprint'))
        return `${formatted} l`;
      return formatted;
    }

    // Strings
    if (typeof forced === 'string') {
      if (forced.trim().length === 0) return 'Kein Wert gespeichert';
      if (forced.startsWith('[') && forced.endsWith(']')) {
        try {
          const parsed = JSON.parse(forced);
          if (Array.isArray(parsed)) return parsed.join(', ');
        } catch {
          return forced;
        }
      }
      return forced;
    }

    if (Array.isArray(forced)) {
      return forced.join(', ');
    }

    return String(forced);
  }

  private forceValueType(
    value: unknown
  ): boolean | number | string | string[] | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean' || typeof value === 'number') return value;
    if (Array.isArray(value)) {
      return value.map((v) => (v == null ? '' : String(v)));
    }
    if (typeof value === 'object') {
      const unwrapped = this.unwrapPrimitiveValue(value);
      if (unwrapped !== undefined) return unwrapped;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value as object);
      }
    }
    const trimmed = (value as string).trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    const num = Number(trimmed);
    if (trimmed !== '' && !Number.isNaN(num)) return num;
    return trimmed;
  }

  private unwrapPrimitiveValue(
    obj: unknown
  ): string | number | boolean | undefined {
    if (typeof obj !== 'object' || obj === null) return undefined;
    const record = obj as Record<string, unknown>;
    const inner = record['value'];
    if (
      typeof inner === 'string' ||
      typeof inner === 'number' ||
      typeof inner === 'boolean'
    ) {
      return inner;
    }
    return undefined;
  }
}
