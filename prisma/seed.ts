/*
 * Copyright Fraunhofer Institute for Material Flow and Logistics
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * For details on the licensing terms, see the LICENSE file.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Entity, importEntities } from './data-import';

// Get the data folder from command line argument or default to 'data'
const dataFolder = process.argv[2] === 'ai' ? 'data-ai' : 'data';
const dataPath = path.join(__dirname, dataFolder);

// Dynamic require function
const requireData = (file: string) => require(path.join(dataPath, file));

const companies = requireData('companies.json');
const users = requireData('users.json');
const addresses = requireData('addresses.json');
const products = requireData('products.json');
const material = requireData('material.json');
const packaging = requireData('packaging.json');
const packagingMaterials = requireData('packaging-materials.json');
const generalWaste = requireData('waste-general.json');
const utilizableWaste = requireData('waste-utilizable.json');
const nonUtilizableWaste = requireData('waste-non-utilizable.json');
const waste = requireData('waste.json');
const waste_material = requireData('waste_material.json');
const groups = requireData('groups.json');
const wasteFlows = requireData('waste-flow.json');
const associatedCompanies = requireData('associated-companies.json');
const variants = requireData('variants.json');
const productPackagings = requireData('product-packagings.json');
const preliminaryProducts = requireData('preliminary-product.json');
const productMaterials = requireData('product-material.json');
const rareEarths = requireData('rare-earths.json');
const criticalRawMaterials = requireData('critical-raw-materials.json');
const reports = requireData('reports.json');
const strategies = requireData('strategies.json');
const measures = requireData('measures.json');
const measureStrategies = requireData('measure-strategy.json');
const financialImpacts = requireData('financial-impacts.json');
const criticalAssumptions = requireData('critical-assumptions.json');
const partPackagings = requireData('part-packagings.json');
const goalPlanning = requireData('goal-planning.json');
const goals = requireData('goals.json');
const goalStrategies = requireData('goal-strategy-connections.json');

const prisma = new PrismaClient();

const dataSets: Entity[] = [
  {
    name: 'wasteFlow',
    records: wasteFlows,
    createRecord: async (data: any) => await prisma.wasteFlow.create({ data }),
  },
  {
    name: 'group',
    records: groups,
    createRecord: async (data: any) =>
      await prisma.productGroup.create({ data }),
  },
  {
    name: 'variants',
    records: variants,
    createRecord: async (data: any) => await prisma.variant.create({ data }),
  },
  {
    name: 'companies',
    records: companies,
    createRecord: async (data: any) => await prisma.company.create({ data }),
  },
  {
    name: 'associatedCompanies',
    records: associatedCompanies,
    createRecord: async (data: any) =>
      await prisma.associatedCompanies.create({ data }),
  },
  {
    name: 'users',
    records: users,
    createRecord: async (data: any) => await prisma.user.create({ data }),
  },
  {
    name: 'addresses',
    records: addresses,
    createRecord: async (data: any) => await prisma.address.create({ data }),
  },
  {
    name: 'utilizableWaste',
    records: utilizableWaste,
    createRecord: async (data: any) =>
      await prisma.utilizableWaste.create({ data }),
  },
  {
    name: 'nonUtilizableWaste',
    records: nonUtilizableWaste,
    createRecord: async (data: any) =>
      await prisma.nonUtilizableWaste.create({ data }),
  },
  {
    name: 'generalWaste',
    records: generalWaste,
    createRecord: async (data: any) =>
      await prisma.generalWaste.create({ data }),
  },
  {
    name: 'waste',
    records: waste,
    createRecord: async (data: any) => await prisma.waste.create({ data }),
  },
  {
    name: 'products',
    records: products,
    createRecord: async (data: any) => await prisma.product.create({ data }),
  },
  {
    name: 'material',
    records: material,
    createRecord: async (data: any) => await prisma.material.create({ data }),
  },
  {
    name: 'packaging',
    records: packaging,
    createRecord: async (data: any) => await prisma.packaging.create({ data }),
  },
  {
    name: 'packagingMaterials',
    records: packagingMaterials,
    createRecord: async (data: any) =>
      await prisma.packagingMaterials.create({ data }),
  },
  {
    name: 'partpackaging',
    records: partPackagings,
    createRecord: async (data: any) =>
      await prisma.packagingPartPackaging.create({ data }),
  },
  {
    name: 'waste_material',
    records: waste_material,
    createRecord: async (data: any) =>
      await prisma.wasteMaterial.create({ data }),
  },
  {
    name: 'productPackagings',
    records: productPackagings,
    createRecord: async (data: any) =>
      await prisma.productPackaging.create({ data }),
  },
  {
    name: 'preliminaryProducts',
    records: preliminaryProducts,
    createRecord: async (data: any) =>
      await prisma.productPreliminaryProduct.create({ data }),
  },
  {
    name: 'productMaterials',
    records: productMaterials,
    createRecord: async (data: any) =>
      await prisma.productMaterials.create({ data }),
  },
  {
    name: 'criticalRawMaterials',
    records: criticalRawMaterials,
    createRecord: async (data: any) =>
      await prisma.criticalRawMaterials.create({ data }),
  },
  {
    name: 'rareEarths',
    records: rareEarths,
    createRecord: async (data: any) => await prisma.rareEarths.create({ data }),
  },

  {
    name: 'reports',
    records: reports,
    createRecord: async (data: any) => await prisma.report.create({ data }),
  },
  {
    name: 'goal-information',
    records: goalPlanning,
    createRecord: async (data: any) =>
      await prisma.goalPlanning.create({ data }),
  },
  {
    name: 'strategies',
    records: strategies,
    createRecord: async (data: any) => await prisma.strategy.create({ data }),
  },
  {
    name: 'goals',
    records: goals,
    createRecord: async (data: any) => await prisma.goal.create({ data }),
  },
  {
    name: 'goal strategies connections',
    records: goalStrategies,
    createRecord: async (data: any) =>
      await prisma.goalStrategy.create({ data }),
  },
  {
    name: 'measures',
    records: measures,
    createRecord: async (data: any) => await prisma.measure.create({ data }),
  },
  {
    name: 'measureStrategies',
    records: measureStrategies,
    createRecord: async (data: any) =>
      await prisma.measuresStrategies.create({ data }),
  },
  {
    name: 'financialImpacts',
    records: financialImpacts,
    createRecord: async (data: any) =>
      await prisma.financialImpact.create({ data }),
  },
  {
    name: 'criticalAssumptions',
    records: criticalAssumptions,
    createRecord: async (data: any) =>
      await prisma.criticalAssumption.create({ data }),
  },
];

importEntities(dataSets)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('### Error during data import:');
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
