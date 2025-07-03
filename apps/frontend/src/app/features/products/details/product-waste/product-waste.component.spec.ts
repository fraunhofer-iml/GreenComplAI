/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../../../core/services/data-service/data.service';
import { ProductWasteComponent } from './product-waste.component';

describe('ProductWasteComponent', () => {
  let component: ProductWasteComponent;
  let fixture: ComponentFixture<ProductWasteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductWasteComponent],
      providers: [
        { provide: DataService, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductWasteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
