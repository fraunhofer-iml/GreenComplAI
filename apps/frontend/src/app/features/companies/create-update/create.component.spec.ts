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
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { CompanyCreateComponent } from './create.component';

describe('CompanyCreateComponent', () => {
  let component: CompanyCreateComponent;
  let fixture: ComponentFixture<CompanyCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyCreateComponent, BrowserAnimationsModule],
      providers: [
        CompaniesService,
        provideHttpClient(),
        { provide: DataService, useValue: {} },
        provideQueryClient(new QueryClient()),
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

    fixture = TestBed.createComponent(CompanyCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
