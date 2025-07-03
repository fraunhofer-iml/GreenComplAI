/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthRoles } from '@ap2/api-interfaces';
import { KeycloakService } from 'keycloak-angular';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { AuthenticationService } from '../../../core/services/authentication/authentication.service';
import { CompaniesService } from '../../../core/services/companies/companies.service';
import { ProductDetailsComponent } from './details.component';

describe('ProductDetailsComponent', () => {
  let component: ProductDetailsComponent;
  let fixture: ComponentFixture<ProductDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [
        CompaniesService,
        {
          provide: KeycloakService,
          useValue: {
            keycloakEvents$: of({ type: 'TEST_EVENT' }),
            getUserRoles: () => [],
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            getCurrentUserRole: () => AuthRoles.SUSTAINABILITY_MANAGER,
          },
        },
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

    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
