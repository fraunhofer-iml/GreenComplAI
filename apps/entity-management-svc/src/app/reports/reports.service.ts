/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmqpException } from '@ap2/amqp';
import {
  CreateReportDto,
  ErrorMessages,
  FinancialImpactCreateDto,
  FindAllReportsForCompanyProps,
  GoalDto,
  GoalPlanningDto,
  MeasureCreateDto,
  PaginatedData,
  ReportEntity,
  ReportEntityOverview,
  StrategyDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  FinancialImpact,
  GoalPlanning,
  Measure,
  Prisma,
  Strategy,
} from '@prisma/client';
import { getFilterAsBool } from '../utils/filter-utils';
import { getSorting } from '../utils/sorting.util';
import { createUpdateGoalsPlanningQuery } from './queries/create-update-goals-planning.query';
import { createGoalQuery } from './queries/goal-create.query';
import { updateGoalQuery } from './queries/goal-update.query';
import { upsertFinancialImpact } from './queries/impact-upsert.query';
import { upsertMeasures } from './queries/measure-upsert.query';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(data: CreateReportDto): Promise<ReportEntity> {
    try {
      const report = await this.prisma.report.create({
        data: {
          assetsBusinessActivitiesEvaluated:
            data.assetsBusinessActivitiesEvaluated,
          evaluationMethodsAssumptionsTools:
            data.evaluationMethodsAssumptionsTools,
          consultationsConducted: data.consultationsConducted,
          consultationMethods: data.consultationMethods,
          evaluationYear: data.evaluationYear,
          isFinalReport: data.isFinalReport,
          flags: data.flags,
        },
        include: {
          strategies: true,
          measures: {
            include: {
              strategies: { include: { strategy: true } },
              previousReport: true,
            },
          },
          financialImpacts: { include: { criticalAssumptions: true } },
          goalPlanning: true,
          goals: {
            include: { strategies: { include: { strategy: true } } },
          },
        },
      });

      return report;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AmqpException(
          ErrorMessages.reportYearIsNotUnique,
          HttpStatus.BAD_REQUEST
        );
      } else throw error;
    }
  }

  async getAllReports({
    filters,
    page,
    size,
    sorting,
  }: FindAllReportsForCompanyProps): Promise<
    PaginatedData<ReportEntityOverview>
  > {
    const skip: number = (page - 1) * size;
    const f = await this.getWhereCondition(filters);
    const s = getSorting(
      sorting === '{}' ? '{"evaluationYear": "desc"}' : sorting
    ) as Prisma.ReportOrderByWithRelationInput;

    const reports = await this.prisma.report.findMany({
      skip: skip,
      take: size,
      where: { AND: f },
      select: {
        id: true,
        evaluationYear: true,
        consultationsConducted: true,
        assetsBusinessActivitiesEvaluated: true,
        isFinalReport: true,
        measures: true,
        _count: { select: { measures: true, strategies: true, goals: true } },
      },
      orderBy: s,
    });

    const totalCount = await this.prisma.report.count({
      where: { AND: f },
    });

    return {
      data: reports,
      meta: { page: page, totalCount: totalCount, pageSize: size },
    };
  }

  async updateReport(id: string, data: CreateReportDto): Promise<ReportEntity> {
    try {
      await this.prisma.report.update({
        where: { id: id, isFinalReport: false },
        data: {
          assetsBusinessActivitiesEvaluated:
            data.assetsBusinessActivitiesEvaluated,
          consultationMethods: data.consultationMethods,
          consultationsConducted: data.consultationsConducted,
          evaluationMethodsAssumptionsTools:
            data.evaluationMethodsAssumptionsTools,
          evaluationYear: data.evaluationYear,
          isFinalReport: data.isFinalReport,
        },
      });

      if (data.isFinalReport) {
        await this.copyMeasures(id);
      }

      return await this.getReportById(id);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AmqpException(
          ErrorMessages.reportYearIsNotUnique,
          HttpStatus.BAD_REQUEST
        );
      } else throw error;
    }
  }

  async updateStrategies(
    strategies: StrategyDto[],
    reportId: string
  ): Promise<Strategy[]> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new AmqpException('Report not found', HttpStatus.NOT_FOUND);
    }
    if (report.isFinalReport) return [];

    await this.prisma.strategy.deleteMany({
      where: {
        AND: [
          { id: { notIn: strategies.map((i) => i.id ?? '') } },
          { reportId: reportId },
        ],
      },
    });

    const updateCalls = [];
    for (const strategy of strategies) {
      updateCalls.push(
        this.prisma.strategy.upsert({
          where: { id: strategy.id ?? '' },
          create: {
            conceptInformationResources: strategy.conceptInformationResources,
            name: strategy.name,
            resourceImpactAndRecycling: strategy.resourceImpactAndRecycling,
            sustainableProcurementImpact: strategy.sustainableProcurementImpact,
            reportId: reportId,
          },
          update: {
            conceptInformationResources: strategy.conceptInformationResources,
            name: strategy.name,
            resourceImpactAndRecycling: strategy.resourceImpactAndRecycling,
            sustainableProcurementImpact: strategy.sustainableProcurementImpact,
            reportId: reportId,
          },
        })
      );
    }
    return await Promise.all(updateCalls);
  }

  async updateMeasures(
    measures: MeasureCreateDto[],
    reportId: string
  ): Promise<Measure[]> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new AmqpException('Report not found', HttpStatus.NOT_FOUND);
    }
    if (report.isFinalReport) return [];

    await this.prisma.measure.deleteMany({
      where: {
        AND: [
          { id: { notIn: measures.map((i) => i.id ?? '') } },
          { reportId: reportId },
        ],
      },
    });

    const updateCalls = [];
    for (const measure of measures) {
      updateCalls.push(
        this.prisma.measure.upsert(upsertMeasures(measure, reportId))
      );
    }

    return await Promise.all(updateCalls);
  }

  async getReportById(id: string): Promise<ReportEntity | null> {
    return await this.prisma.report.findUnique({
      where: {
        id,
      },
      include: {
        strategies: true,
        measures: {
          include: {
            strategies: { include: { strategy: true } },
            previousReport: true,
          },
        },
        financialImpacts: {
          include: {
            criticalAssumptions: true,
          },
        },
        goalPlanning: true,
        goals: {
          include: { strategies: { include: { strategy: true } } },
        },
      },
    });
  }

  private async getWhereCondition(
    filter: string | undefined
  ): Promise<Prisma.ReportWhereInput[]> {
    if (!filter) return [];

    const filterAsBool = getFilterAsBool(filter);
    const filterAsNumber = Number(filter);

    const orConditions: Prisma.ReportWhereInput[] = [
      { id: { contains: filter } },
      { consultationsConducted: { equals: filterAsBool } },
      { assetsBusinessActivitiesEvaluated: { equals: filterAsBool } },
      { isFinalReport: { equals: filterAsBool } },
    ];

    if (!isNaN(filterAsNumber)) {
      const reportIds = await this.getIdsForAmountOfRelations(filterAsNumber);
      orConditions.push({
        id: { in: reportIds },
      });
      orConditions.push({ evaluationYear: { equals: filterAsNumber } });
    }

    return [{ OR: orConditions }];
  }

  private async copyMeasures(id: string): Promise<void> {
    const currentReport = await this.prisma.report.findUnique({
      where: { id: id },
      include: {
        measures: {
          include: { strategies: { include: { strategy: true } } },
        },
      },
    });

    if (!currentReport) return;

    const measuresToCopy = currentReport.measures.filter(
      (m) => m.plannedCompletion.getFullYear() > currentReport.evaluationYear
    );

    if (measuresToCopy.length > 0) {
      let nextReport = await this.prisma.report.findUnique({
        where: { evaluationYear: currentReport.evaluationYear + 1 },
      });

      if (!nextReport) {
        nextReport = await this.createReport({
          isFinalReport: false,
          evaluationYear: currentReport.evaluationYear + 1,
          assetsBusinessActivitiesEvaluated: false,
          consultationsConducted: false,
          consultationMethods: '',
          evaluationMethodsAssumptionsTools: '',
          flags: [],
        } as CreateReportDto);
      }

      const createCalls = [];
      measuresToCopy.forEach((measure) => {
        createCalls.push(
          this.prisma.measure.create({
            data: {
              title: measure.title,
              status: measure.status,
              expectedResult: measure.expectedResult,
              contributionAchievingStrategy:
                measure.contributionAchievingStrategy,
              plannedCompletion: measure.plannedCompletion,
              impactOnValueChainAndStakeholders:
                measure.impactOnValueChainAndStakeholders,
              reportId: nextReport.id,
              previousReportId: currentReport.id,
              strategies: {
                create: measure.strategies.map((strategy) => ({
                  strategy: {
                    create: {
                      conceptInformationResources:
                        strategy.strategy.conceptInformationResources,
                      name: strategy.strategy.name,
                      resourceImpactAndRecycling:
                        strategy.strategy.resourceImpactAndRecycling,
                      sustainableProcurementImpact:
                        strategy.strategy.sustainableProcurementImpact,
                      reportId: nextReport.id,
                    },
                  },
                })),
              },
            },
          })
        );
      });

      await Promise.all(createCalls);
    }
  }

  async updateFinancialImpacts(
    impacts: FinancialImpactCreateDto[],
    reportId: string
  ): Promise<FinancialImpact[]> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new AmqpException('Report not found', HttpStatus.NOT_FOUND);
    }
    if (report.isFinalReport) return [];

    await this.prisma.financialImpact.deleteMany({
      where: {
        AND: [
          { id: { notIn: impacts.map((i) => i.id ?? '') } },
          { reportId: reportId },
        ],
      },
    });

    const updateCalls = [];
    for (const impact of impacts) {
      await this.prisma.criticalAssumption.deleteMany({
        where: {
          id: {
            notIn: impacts.flatMap((i) =>
              i.criticalAssumptions.map((a) => a.id)
            ),
          },
          financialImpactId: impact.id,
        },
      });

      updateCalls.push(
        this.prisma.financialImpact.upsert(
          upsertFinancialImpact(impact, reportId)
        )
      );
    }

    return await Promise.all(updateCalls);
  }

  async updateGoalPlanning(
    reportId: string,
    planning: GoalPlanningDto
  ): Promise<GoalPlanning | null> {
    const report = await this.getReportById(reportId);
    if (!report || report.isFinalReport) return null;

    const result = await this.prisma.goalPlanning.upsert({
      where: { id: planning.id ?? '' },
      create: {
        ...createUpdateGoalsPlanningQuery(planning),
        reportId: reportId,
      },
      update: {
        ...createUpdateGoalsPlanningQuery(planning),
      },
    });

    await this.prisma.goal.deleteMany({ where: { reportId: reportId } });

    return result;
  }

  async createOrUpdateGoals(
    reportId: string,
    goals: GoalDto[]
  ): Promise<ReportEntity> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new AmqpException('Report not found', HttpStatus.NOT_FOUND);
    }
    if (report.isFinalReport) {
      throw new AmqpException(
        'Report is final and cannot be modified',
        HttpStatus.BAD_REQUEST
      );
    }

    await this.prisma.goal.deleteMany({
      where: {
        AND: [
          { id: { notIn: goals.map((i) => i.id ?? '') } },
          { reportId: reportId },
        ],
      },
    });

    const updateCalls = [];
    goals.forEach((goal) => {
      const { id, ...data } = goal;
      updateCalls.push(
        id
          ? this.prisma.goal.update(updateGoalQuery(goal))
          : this.prisma.goal.create(createGoalQuery(data, reportId))
      );
    });

    await Promise.all(updateCalls);

    return await this.getReportById(reportId);
  }

  private async getIdsForAmountOfRelations(
    filerNumber: number
  ): Promise<string[]> {
    const t = await this.prisma.report.findMany({
      select: {
        id: true,
        _count: { select: { measures: true, strategies: true, goals: true } },
      },
    });
    return t
      .filter((item) => {
        return (
          item._count.goals === filerNumber ||
          item._count.measures === filerNumber ||
          item._count.strategies === filerNumber
        );
      })
      .map((i) => i.id);
  }
}
