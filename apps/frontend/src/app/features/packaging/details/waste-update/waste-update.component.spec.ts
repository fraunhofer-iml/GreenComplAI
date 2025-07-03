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
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { WasteUpdateComponent } from './waste-update.component';

describe('WasteUpdateComponent', () => {
  let component: WasteUpdateComponent;
  let fixture: ComponentFixture<WasteUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasteUpdateComponent, BrowserAnimationsModule],
      providers: [
        PackagingService,
        provideHttpClient(),
        provideQueryClient(new QueryClient()),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WasteUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
