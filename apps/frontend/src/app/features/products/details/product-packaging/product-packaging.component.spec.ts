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
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { DataService } from '../../../../core/services/data-service/data.service';
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { ProductsService } from '../../../../core/services/products/products.service';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { ProductPackagingComponent } from './product-packaging.component';

describe('ProductPackagingComponent', () => {
  let component: ProductPackagingComponent;
  let fixture: ComponentFixture<ProductPackagingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductPackagingComponent, BrowserAnimationsModule],
      providers: [
        ProductsService,
        PackagingService,
        provideHttpClient(),
        ProductConstructionService,
        { provide: DataService, useValue: {} },
        provideAngularQuery(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductPackagingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
