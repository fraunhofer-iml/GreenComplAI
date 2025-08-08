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
  FinancialImpactDto,
  FindAllReportsForCompanyProps,
  GoalDto,
  GoalPlanningDto,
  ImpactType,
  MeasureCreateDto,
  MeasureDto,
  MeasureStatus,
  PaginatedData,
  ReportDto,
  ReportOverviewDto,
  StrategyDto,
} from '@ap2/api-interfaces';
import { PrismaService } from '@ap2/database';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { upsertFinancialImpact } from './queries/impact-upsert.query';
import { upsertMeasures } from './queries/measure-upsert.query';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(data: CreateReportDto): Promise<ReportDto> {
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
            include: { strategies: { include: { strategy: true } } },
          },
          financialImpacts: { include: { criticalAssumptions: true } },
        },
      });

      return {
        ...report,
        measures: report.measures.map((m) => ({
          ...m,
          strategies: m.strategies.map((s) => s.strategy),
          status:
            m.status === MeasureStatus.IN_PROGRESS
              ? MeasureStatus.IN_PROGRESS
              : MeasureStatus.PLANNED,
        })),
        financialImpacts: report.financialImpacts.map((f) => ({
          ...f,
          type:
            f.type === ImpactType.CHANCE ? ImpactType.CHANCE : ImpactType.RISK,
        })),
        goals: [],
      };
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
    PaginatedData<ReportOverviewDto | null>
  > {
    const skip: number = (page - 1) * size;
    const f = this.getWhereCondition(filters);

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
      orderBy: JSON.parse(
        sorting === '{}' ? '{"evaluationYear": "desc"}' : sorting
      ),
    });

    const totalCount = await this.prisma.report.count({
      where: { AND: f },
    });

    return {
      data: reports.map((result) => ({
        ...result,
        numberOfGoals: result._count.goals,
        numberOfMeasures: result._count.strategies,
        numberOfMeasures: result._count.measures,
        numberOfStrategies: result._count.strategies,
      })),
      meta: { page: page, totalCount: totalCount, pageSize: size },
    };
  }

  async updateReport(id: string, data: CreateReportDto): Promise<ReportDto> {
    try {
      const report = await this.prisma.report.update({
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
        include: {
          strategies: true,
          measures: {
            include: { strategies: { include: { strategy: true } } },
          },
          financialImpacts: { include: { criticalAssumptions: true } },
        },
      });

      if (data.isFinalReport) {
        await this.copyMeasures(id);
      }

      return {
        ...report,
        measures: report.measures.map((m) => ({
          ...m,
          strategies: m.strategies.map((s) => s.strategy),
          status:
            m.status === MeasureStatus.IN_PROGRESS
              ? MeasureStatus.IN_PROGRESS
              : MeasureStatus.PLANNED,
        })),
        financialImpacts: report.financialImpacts.map((f) => ({
          ...f,
          type:
            f.type === ImpactType.CHANCE ? ImpactType.CHANCE : ImpactType.RISK,
        })),
        goals: [],
      };
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
  ): Promise<StrategyDto[]> {
    const report = await this.getReportById(reportId);
    if (report.isFinalReport) return;

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
  ): Promise<MeasureDto[]> {
    const report = await this.getReportById(reportId);
    if (report.isFinalReport) return;

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

  async getReportById(id: string): Promise<ReportDto> {
    const res = await this.prisma.report.findUnique({
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
            criticalAssumptions: { orderBy: { title: 'asc' } },
          },
          orderBy: { title: 'asc' },
        },
        goalPlanning: true,
        goals: {
          include: { strategies: { include: { strategy: true } } },
          orderBy: { title: 'asc' },
        },
      },
    });

    return {
      ...res,
      financialImpacts: res.financialImpacts.map((f) => ({
        ...f,
        type:
          f.type === ImpactType.CHANCE ? ImpactType.CHANCE : ImpactType.RISK,
      })),
      measures: res.measures.map((m) => ({
        ...m,
        strategies: m.strategies.map((s) => s.strategy),
        status:
          m.status === MeasureStatus.IN_PROGRESS
            ? MeasureStatus.IN_PROGRESS
            : MeasureStatus.PLANNED,
        previousReport: m.previousReport?.evaluationYear,
      })),
      goalPlanning: {
        ...res.goalPlanning,
      },
      goals: res.goals.map((goal) => ({
        ...goal,
        strategies: goal.strategies.map((goalStrategy) => ({
          id: goalStrategy.strategy.id,
          connection: goalStrategy.connection,
        })),
      })),
    };
  }

  private getWhereCondition(
    filter: string | undefined
  ): Prisma.ReportWhereInput[] {
    if (!filter) return [];

    const filterAsNumber = Number(filter);
    const orConditions: Prisma.ReportWhereInput[] = [
      { id: { contains: filter } },
      { evaluationMethodsAssumptionsTools: { contains: filter } },
      { consultationMethods: { contains: filter } },
    ];

    if (!isNaN(filterAsNumber)) {
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
      let nextReport: Partial<ReportDto> = await this.prisma.report.findUnique({
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
  ): Promise<FinancialImpactDto[]> {
    const report = await this.getReportById(reportId);
    if (report.isFinalReport) return;

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
      updateCalls.push(
        this.prisma.criticalAssumption.deleteMany({
          where: {
            id: {
              notIn: impacts.flatMap((i) =>
                i.criticalAssumptions.map((a) => a.id)
              ),
            },
            financialImpactId: impact.id,
          },
        })
      );

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
  ): Promise<GoalPlanningDto> {
    const report = await this.getReportById(reportId);
    if (report.isFinalReport) return;

    const result = await this.prisma.goalPlanning.upsert({
      where: { id: planning.id ?? '' },
      create: {
        hasPlannedGoals: planning.hasPlannedGoals,
        deadlineEnd: planning.deadlineEnd,
        deadlineStart: planning.deadlineStart,
        followUpProcedure: planning.followUpProcedure,
        progressEvaluation: planning.progressEvaluation,
        referencePeriodForProgressEnd: planning.referencePeriodForProgressEnd,
        referencePeriodForProgressStart:
          planning.referencePeriodForProgressStart,
        targets: planning.targets,
        reportId: reportId,
        goalsTracked: planning.goalsTracked,
        noGoalsExplanation: planning.noGoalsExplanation,
      },
      update: {
        hasPlannedGoals: planning.hasPlannedGoals,
        deadlineEnd: planning.hasPlannedGoals ? planning.deadlineEnd : null,
        deadlineStart: planning.hasPlannedGoals ? planning.deadlineStart : null,
        followUpProcedure: planning.goalsTracked
          ? planning.followUpProcedure
          : null,
        progressEvaluation: planning.goalsTracked
          ? planning.progressEvaluation
          : null,
        referencePeriodForProgressEnd: planning.goalsTracked
          ? planning.referencePeriodForProgressEnd
          : null,
        referencePeriodForProgressStart: planning.goalsTracked
          ? planning.referencePeriodForProgressStart
          : null,
        targets: planning.goalsTracked ? planning.targets : null,
        goalsTracked: planning.goalsTracked,
        noGoalsExplanation: !planning.hasPlannedGoals
          ? planning.noGoalsExplanation
          : null,
      },
    });

    await this.prisma.goal.deleteMany({ where: { reportId: reportId } });

    return { ...result };
  }

  async createOrUpdateGoals(reportId: string, goals: GoalDto[]) {
    const report = await this.getReportById(reportId);
    if (report.isFinalReport) return;

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
          ? this.prisma.goal.update({
              where: { id: id },
              data: {
                ...data,
                strategies: {
                  upsert: goal.strategies.map((connectedStrategy) => ({
                    where: {
                      goalId_strategyId: {
                        goalId: goal.id,
                        strategyId: connectedStrategy.id,
                      },
                    },
                    update: { connection: connectedStrategy.connection },
                    create: {
                      strategyId: connectedStrategy.id,
                      connection: connectedStrategy.connection,
                    },
                  })),
                  deleteMany: {
                    AND: [
                      {
                        strategyId: {
                          notIn: goal.strategies.map(
                            (connectedStrategy) => connectedStrategy.id ?? ''
                          ),
                        },
                      },
                      { goalId: id },
                    ],
                  },
                },
              },
            })
          : this.prisma.goal.create({
              data: {
                ...data,
                validityPeriodEnd: goal.validityPeriodEnd,
                validityPeriodStart: goal.validityPeriodStart,
                strategies: {
                  create: goal.strategies.map((connectedStrategy) => ({
                    strategy: { connect: { id: connectedStrategy.id } },
                    connection: connectedStrategy.connection,
                  })),
                },
                reportId: reportId,
              },
            })
      );
    });

    await Promise.all(updateCalls);

    return { ...report, goals: [] };
  }
}
