/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { CompanyOverviewComponent } from './overview.component';

describe('CompanyOverviewComponent', () => {
  let component: CompanyOverviewComponent;
  let fixture: ComponentFixture<CompanyOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyOverviewComponent],
      providers: [
        CompaniesService,
        { provide: DataService, useValue: {} },
        provideHttpClient(),
        provideAngularQuery(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            getCurrentUserRole: () => Promise.resolve('sustainability_manager'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
