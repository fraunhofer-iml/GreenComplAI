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
import { OutlierDetectionAnalysisComponent } from './outlier-detection-analysis.component';

describe('OutlierDetectionAnalysisComponent', () => {
  let component: OutlierDetectionAnalysisComponent;
  let fixture: ComponentFixture<OutlierDetectionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutlierDetectionAnalysisComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideAngularQuery(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OutlierDetectionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
