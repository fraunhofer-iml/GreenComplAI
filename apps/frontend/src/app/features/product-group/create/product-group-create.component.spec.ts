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
import { ProductGroupService } from '../../../core/services/product-group/product-group.service';
import { ProductGroupCreateComponent } from './product-group-create.component';

describe('ProductGroupCreateComponent', () => {
  let component: ProductGroupCreateComponent;
  let fixture: ComponentFixture<ProductGroupCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductGroupCreateComponent, BrowserAnimationsModule],
      providers: [
        ProductGroupService,
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

    fixture = TestBed.createComponent(ProductGroupCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
