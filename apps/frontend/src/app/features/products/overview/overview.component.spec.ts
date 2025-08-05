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
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { OverviewComponent } from '../../../shared/components/overview/overview.component';
import { ProductOverviewComponent } from './overview.component';

describe('ProductOverviewComponent', () => {
  let component: ProductOverviewComponent;
  let fixture: ComponentFixture<ProductOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProductOverviewComponent,
        OverviewComponent,
        BrowserAnimationsModule,
      ],
      providers: [
        ProductsService,
        CompaniesService,
        { provide: DataService, useValue: {} },
        provideHttpClient(),
        provideQueryClient(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
