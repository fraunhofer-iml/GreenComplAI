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
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../../core/services/reports/reports.service';
import { financialImpactsFormGroup } from '../overview/financial-impacts.form-group';
import { UpdateFinancialImpactComponent } from './update-financial-impact.component';

describe('UpdateFinancialImpactComponent', () => {
  let component: UpdateFinancialImpactComponent;
  let fixture: ComponentFixture<UpdateFinancialImpactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateFinancialImpactComponent, BrowserAnimationsModule],
      providers: [
        ReportsService,
        provideHttpClient(),
        provideQueryClient(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateFinancialImpactComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isFinal', true);
    fixture.componentRef.setInput('form', financialImpactsFormGroup());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
