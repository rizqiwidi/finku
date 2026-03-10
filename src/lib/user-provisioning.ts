import type { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORY_TEMPLATES } from './default-categories';

type ProvisioningClient = Prisma.TransactionClient | PrismaClient;

interface ProvisionUserDefaultsOptions {
  monthlyIncome?: number;
  savingsPercentage?: number;
}

export async function provisionUserDefaults(
  client: ProvisioningClient,
  userId: string,
  options: ProvisionUserDefaultsOptions = {}
) {
  await client.userSettings.upsert({
    where: { userId },
    update: {
      monthlyIncome: options.monthlyIncome ?? undefined,
      savingsPercentage: options.savingsPercentage ?? undefined,
    },
    create: {
      userId,
      monthlyIncome: options.monthlyIncome ?? 0,
      savingsPercentage: options.savingsPercentage ?? 20,
    },
  });

  const existingCategories = await client.category.findMany({
    where: { userId },
  });

  const categories =
    existingCategories.length > 0
      ? existingCategories
      : await Promise.all(
          DEFAULT_CATEGORY_TEMPLATES.map((category) =>
            client.category.create({
              data: {
                ...category,
                userId,
                budget: category.budget ?? null,
                allocationPercentage: category.allocationPercentage ?? 0,
              },
            })
          )
        );

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const expenseCategories = categories.filter(
    (category) => category.type === 'expense' && category.budget !== null
  );

  await Promise.all(
    expenseCategories.map((category) =>
      client.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId: category.id,
            month,
            year,
          },
        },
        update: {
          amount: category.budget ?? 0,
          period: 'monthly',
        },
        create: {
          userId,
          categoryId: category.id,
          amount: category.budget ?? 0,
          period: 'monthly',
          month,
          year,
        },
      })
    )
  );
}
