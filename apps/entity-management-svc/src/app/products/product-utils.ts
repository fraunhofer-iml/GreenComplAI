import { Prisma } from '@prisma/client';

export const getWhereCondition = (
  filter: string | undefined,
  isSellable?: boolean
): Prisma.ProductWhereInput => {
  const filterAsNumber = Number(filter);

  const conditions: Prisma.ProductWhereInput[] = [];

  if (isSellable !== undefined) {
    conditions.push({ isSellable });
  }

  if (filter && filter !== '') {
    const orCondition: Prisma.ProductWhereInput = {
      OR: [
        { id: { contains: filter } },
        { productId: { contains: filter } },
        { name: { contains: filter } },
        { description: { contains: filter } },
        { category: { contains: filter } },
        { productGroup: { name: { contains: filter } } },
        { wasteFlow: { name: { contains: filter } } },
        { supplier: { name: { contains: filter } } },
        { manufacturer: { name: { contains: filter } } },
        {
          materials: {
            some: { material: { name: { contains: filter } } },
          },
        },
      ],
    };

    if (!Number.isNaN(filterAsNumber)) {
      const whereNumber: Prisma.ProductWhereInput[] = [
        { percentageOfBiologicalMaterials: { equals: filterAsNumber / 100 } },
      ];
      orCondition.OR = [...orCondition.OR, ...whereNumber];
    }

    conditions.push(orCondition);
  }

  return conditions.length > 0 ? { AND: conditions } : {};
};
