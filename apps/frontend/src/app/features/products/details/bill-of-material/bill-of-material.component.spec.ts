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
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { DataService } from '../../../../core/services/data-service/data.service';
import { ProductsService } from '../../../../core/services/products/products.service';
import { ProductConstructionService } from '../../create/form-construction/product-construction.service';
import { BillOfMaterialComponent } from './bill-of-material.component';

describe('BillOfMaterialComponent', () => {
  let component: BillOfMaterialComponent;
  let fixture: ComponentFixture<BillOfMaterialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillOfMaterialComponent, BrowserAnimationsModule],
      providers: [
        ProductsService,
        provideHttpClient(),
        ProductConstructionService,
        provideQueryClient(new QueryClient()),
        { provide: DataService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillOfMaterialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
