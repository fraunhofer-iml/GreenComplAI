/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import { WasteflowAnalysisGraphComponent } from './wasteflow-analysis-graph.component';

describe('WateflowAnalysisGraphComponent', () => {
  let component: WasteflowAnalysisGraphComponent;
  let fixture: ComponentFixture<WasteflowAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasteflowAnalysisGraphComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AnalysisService,
        provideAngularQuery(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WasteflowAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
