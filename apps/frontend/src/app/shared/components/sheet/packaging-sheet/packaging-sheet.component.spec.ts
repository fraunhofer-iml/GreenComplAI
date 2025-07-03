/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PackagingDto } from '@ap2/api-interfaces';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { PackagingService } from '../../../../core/services/packaging/packaging.service';
import { ProductPackagingFormGroup } from '../../../../features/products/create/model/product-form.model';
import { PackagingSheetComponent } from './packaging-sheet.component';

describe('PackagingSheetComponent', () => {
  let component: PackagingSheetComponent;
  let fixture: ComponentFixture<PackagingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PackagingSheetComponent, BrowserAnimationsModule],
      providers: [
        PackagingService,
        provideHttpClient(),
        provideAngularQuery(new QueryClient()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PackagingSheetComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'packagings',
      new FormGroup<ProductPackagingFormGroup>({
        packagings: new FormControl<[PackagingDto, number][]>([], {
          nonNullable: true,
        }),
      })
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
