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
  injectQueryClient,
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { ProductConstructionService } from '../../../products/create/form-construction/product-construction.service';
import { PartPackagingComponent } from './part-packaging.component';

describe('PartPackagingComponent', () => {
  let component: PartPackagingComponent;
  let fixture: ComponentFixture<PartPackagingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartPackagingComponent, BrowserAnimationsModule],
      providers: [
        PackagingService,
        provideHttpClient(),
        ProductConstructionService,
        provideQueryClient(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartPackagingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
