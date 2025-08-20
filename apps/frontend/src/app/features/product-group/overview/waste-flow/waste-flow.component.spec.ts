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
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  provideQueryClient,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { WasteFlowComponent } from './waste-flow.component';

describe('WasteFlowComponent', () => {
  let component: WasteFlowComponent;
  let fixture: ComponentFixture<WasteFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasteFlowComponent, BrowserAnimationsModule],
      providers: [
        provideQueryClient(new QueryClient()),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                id: '123',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WasteFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
