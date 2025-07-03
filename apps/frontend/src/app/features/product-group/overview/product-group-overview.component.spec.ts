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
import { ProductGroupOverviewComponent } from './product-group-overview.component';

describe('ProductGroupOverviewComponent', () => {
  let component: ProductGroupOverviewComponent;
  let fixture: ComponentFixture<ProductGroupOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductGroupOverviewComponent, BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideAngularQuery(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductGroupOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
