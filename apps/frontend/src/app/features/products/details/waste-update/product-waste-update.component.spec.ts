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
import { ProductsService } from '../../../../core/services/products/products.service';
import { ProductWasteUpdateComponent } from './product-waste-update.component';

describe('ProductWasteComponent', () => {
  let component: ProductWasteUpdateComponent;
  let fixture: ComponentFixture<ProductWasteUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductWasteUpdateComponent, BrowserAnimationsModule],
      providers: [
        ProductsService,
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

    fixture = TestBed.createComponent(ProductWasteUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
