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
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { PackagingService } from '../../../core/services/packaging/packaging.service';
import { PackagingDetailsComponent } from './packaging-details.component';

describe('PackagingDetailsComponent', () => {
  let component: PackagingDetailsComponent;
  let fixture: ComponentFixture<PackagingDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackagingDetailsComponent, BrowserAnimationsModule],
      providers: [
        PackagingService,
        provideHttpClient(),
        CompaniesService,
        provideAngularQuery(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackagingDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
