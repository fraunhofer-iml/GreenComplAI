/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssetAdministrationShell,
  Submodel,
} from '@aas-core-works/aas-core3.0-typescript/types';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { DppService } from '../../../core/services/dpp/dpp.service';
import { GenericDppDisplayComponent } from '../components/generic-dpp-display.component';

@Component({
  selector: 'app-dpp-overview',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    GenericDppDisplayComponent,
  ],
  providers: [DppService],
  templateUrl: './dpp-overview.component.html',
})
export class DppOverviewComponent {
  private readonly dppService = inject(DppService);

  id = input<string>('id');

  dppQuery = injectQuery(() => ({
    queryKey: ['dpp', this.id()],
    queryFn: async (): Promise<
      AssetAdministrationShell & { connectedSubmodels: Submodel[] }
    > => this.dppService.getDpp(this.id() ?? ''),
    enabled: !!this.id(),
  }));

  refreshData() {
    this.dppQuery.refetch();
  }
}
