/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  ActivatedRoute,
  convertToParamMap,
  RouterModule,
} from '@angular/router';
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { DataService } from '../../../core/services/data-service/data.service';
import { PackagingService } from '../../../core/services/packaging/packaging.service';
import { ProductsService } from '../../../core/services/products/products.service';
import { ProductConstructionService } from './form-construction/product-construction.service';
import { ProductCreateComponent } from './product-create.component';

describe('ProductCreateComponent', () => {
  let component: ProductCreateComponent;
  let fixture: ComponentFixture<ProductCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCreateComponent, RouterModule, BrowserAnimationsModule],
      providers: [
        CompaniesService,
        ProductsService,
        PackagingService,
        ProductConstructionService,
        provideHttpClient(),
        { provide: DataService, useValue: {} },
        {
          provide: AuthenticationService,
          useValue: {
            getCurrentUserRole: () => AuthRoles.SUSTAINABILITY_MANAGER,
          },
        },
        provideQueryClient(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                id: '123',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
