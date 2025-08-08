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
import { AuthenticationService } from '../../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../../core/services/companies/companies.service';
import { ProductsService } from '../../../../core/services/products/products.service';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { ProductUpdateComponent } from './product-update.component';

describe('ProductUpdateComponent', () => {
  let component: ProductUpdateComponent;
  let fixture: ComponentFixture<ProductUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductUpdateComponent, BrowserAnimationsModule],
      providers: [
        ProductsService,
        provideHttpClient(),
        provideQueryClient(new QueryClient()),
        ProductConstructionService,
        CompaniesService,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            getCurrentUserRole: () =>
              Promise.resolve({ firstName: 'John', lastName: 'Doe' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
