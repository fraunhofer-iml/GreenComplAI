/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseSheetComponent } from './sheet.component';

describe('SheetComponent', () => {
  let component: BaseSheetComponent;
  let fixture: ComponentFixture<BaseSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseSheetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
