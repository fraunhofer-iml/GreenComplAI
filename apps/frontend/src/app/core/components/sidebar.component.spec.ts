/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AuthenticationService } from '../services/authentication/authentication.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SidebarComponent,
        KeycloakAngularModule,
        RouterModule.forRoot([]),
      ],
      providers: [
        {
          provide: KeycloakService,
          useValue: {
            keycloakEvents$: of({ type: 'TEST_EVENT' }),
            getUserRoles: () => [],
            loadUserProfile: () =>
              Promise.resolve({
                firstName: 'John',
                lastName: 'Doe',
              }),
          },
        },
        {
          provide: AuthenticationService,
          useValue: {
            getCurrentUserName: () =>
              Promise.resolve({ firstName: 'John', lastName: 'Doe' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
