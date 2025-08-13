/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CreateReportDto, ErrorMessages, ReportDto } from '@ap2/api-interfaces';
import { toast } from 'ngx-sonner';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  input,
  OnChanges,
  output,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { ReportsService } from '../../../../core/services/reports/reports.service';
import { ErrorToastComponent } from '../../../../shared/components/error-toast.component';
import { FinalizeDialogComponent } from '../dialog/finalize.dialog';
import { ReportForm } from './report.form';
import { ReportTooltip } from './tooltips';

@Component({
  selector: 'app-report-information',
  imports: [
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckbox,
    FormsModule,
    MatTooltip,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    ReactiveFormsModule,
    MatChipsModule,
    MatTabsModule,
  ],
  templateUrl: './report-information.component.html',
})
export class ReportInformationComponent implements OnChanges {
  report = input<ReportDto>();
  refetchEvent = output<void>();
  validateEvent = output<void>();
  reportForm: FormGroup<ReportForm>;
  isValid = input<boolean>(false);

  private readonly dialog = inject(MatDialog);
  private reportsService = inject(ReportsService);
  private router = inject(Router);

  ReportTooltip = ReportTooltip;

  constructor() {
    this.reportForm = new FormGroup({
      id: new FormControl<string | null>(null),
      assetsBusinessActivitiesEvaluated: new FormControl<boolean | null>(false),
      evaluationMethodsAssumptionsTools: new FormControl<string | null>(''),
      consultationsConducted: new FormControl<boolean | null>(false),
      consultationMethods: new FormControl<string | null>(''),
      conceptInformationResources: new FormControl<string | null>(''),
      sustainableProcurementImpact: new FormControl<string | null>(''),
      isFinalReport: new FormControl<boolean | null>(false),
      evaluationYear: new FormControl<Date | null>(null, Validators.required),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['report']) this.setFormData(this.report());
  }

  save(isFinal: boolean) {
    const data = {
      ...this.reportForm.value,
      evaluationYear: this.reportForm.value.evaluationYear?.getFullYear(),
    } as CreateReportDto;

    data.isFinalReport = isFinal;

    if (!this.report()) {
      this.createMutation.mutate(data);
    } else {
      this.updateMutation.mutate({ dto: data, id: this.report()?.id ?? '' });
    }
  }

  createMutation = injectMutation(() => ({
    mutationFn: (dto: CreateReportDto) => this.reportsService.create(dto),
    onSuccess: (res) => this.router.navigate(['reports', res.id]),
    onError: (e: HttpErrorResponse) => this.handleError(e),
  }));

  updateMutation = injectMutation(() => ({
    mutationFn: (props: { dto: CreateReportDto; id: string }) =>
      this.reportsService.update(props.dto, props.id),
    onSuccess: () => this.refetchEvent.emit(),
    onError: (e: HttpErrorResponse) => this.handleError(e),
  }));

  yearHandler(event: Date, picker: MatDatepicker<Date>) {
    this.reportForm.controls.evaluationYear.setValue(new Date(event));
    picker.close();
  }

  setFormData(dto: ReportDto | undefined): void {
    if (!dto) return;
    this.reportForm.patchValue({
      ...dto,
      evaluationYear: new Date(dto.evaluationYear, 1, 1),
    });

    if (dto.isFinalReport) {
      this.reportForm.controls.assetsBusinessActivitiesEvaluated.disable();
      this.reportForm.controls.consultationsConducted.disable();
    }
  }

  async onCloseReport() {
    this.validateEvent.emit();

    const promise = () =>
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          resolve(this.isValid());
        }, 3000)
      );

    toast.loading('Eingaben werden geprüft...', { duration: 3000 });

    await promise().then((res: boolean) => {
      if (res) {
        toast.success('Alle Felder wurden korrekt ausgefüllt', {
          duration: 3000,
        });
        this.openDialog();
      } else
        toast.error(ErrorToastComponent, {
          closeButton: true,
          duration: Infinity,
        });
    });
  }

  private handleError(e: HttpErrorResponse) {
    return e.error.message === ErrorMessages.reportYearIsNotUnique
      ? toast.error('Für dieses Jahr gibt es bereits einen Bericht')
      : toast.error('Speichern fehlgeschlagen');
  }

  private openDialog() {
    this.dialog
      .open(FinalizeDialogComponent, { data: { isValid: this.isValid() } })
      .afterClosed()
      .subscribe((isFinal: boolean) => {
        if (isFinal) this.save(true);
      });
  }
}
