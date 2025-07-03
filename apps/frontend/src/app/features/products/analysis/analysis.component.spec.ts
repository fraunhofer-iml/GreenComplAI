/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AnalysisService } from '../../../core/services/analysis/analysis.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { AnalysisComponent } from './analysis.component';

describe('AnalysisComponent', () => {
  let component: AnalysisComponent;
  let fixture: ComponentFixture<AnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisComponent, BrowserAnimationsModule],
      providers: [
        AnalysisService,
        ProductsService,
        provideAngularQuery(new QueryClient()),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                id: '123',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
