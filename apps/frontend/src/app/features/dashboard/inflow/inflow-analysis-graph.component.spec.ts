/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import { InflowAnalysisGraphComponent } from './inflow-analysis-graph.component';

describe('InflowAnalysisGraphComponent', () => {
  let component: InflowAnalysisGraphComponent;
  let fixture: ComponentFixture<InflowAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InflowAnalysisGraphComponent],
      providers: [
        AnalysisService,
        provideHttpClient(),
        provideQueryClient(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InflowAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
