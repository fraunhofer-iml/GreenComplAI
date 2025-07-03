/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FinancialImpactDto, ReportDto } from '@ap2/api-interfaces';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../../core/services/reports/reports.service';
import { FinancialImpactComponent } from './financial-impact.component';

describe('FinancialImpactComponent', () => {
  let component: FinancialImpactComponent;
  let fixture: ComponentFixture<FinancialImpactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialImpactComponent, BrowserAnimationsModule],
      providers: [
        ReportsService,
        provideHttpClient(),
        provideAngularQuery(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                id: '123',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialImpactComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('report', {
      financialImpacts: [{ criticalAssumptions: [{}] } as FinancialImpactDto],
    } as ReportDto);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
