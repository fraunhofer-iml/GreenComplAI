/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-error-toast',
  imports: [CommonModule],

  template: `<div>
    Es wurden nicht alle erforderlichen Felder im Bereich
    <strong class="text-error-600">Ziele</strong> ausgefüllt.
  </div>`,
})
export class ErrorToastComponent {}
