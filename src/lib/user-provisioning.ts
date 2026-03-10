import type { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORY_TEMPLATES } from './default-categories';
import {
  DEFAULT_TEMPLATE_MONTHLY_INCOME,
  DEFAULT_TEMPLATE_SAVINGS_PERCENTAGE,
  DEFAULT_TRANSACTION_TEMPLATES,
} from './default-transactions';

type ProvisioningClient = Prisma.TransactionClient | PrismaClient;

interface ProvisionUserDefaultsOptions {
  monthlyIncome?: number;
  savingsPercentage?: number;
  includeSampleTransactions?: boolean;
}

export async function provisionUserDefaults(
  client: ProvisioningClient,
  userId: string,
  options: ProvisionUserDefaultsOptions = {}
) {
  const monthlyIncome = options.monthlyIncome ?? DEFAULT_TEMPLATE_MONTHLY_INCOME;
  const savingsPercentage =
    options.savingsPercentage ?? DEFAULT_TEMPLATE_SAVINGS_PERCENTAGE;

  await client.userSettings.upsert({
    where: { userId },
    update: {
      monthlyIncome: options.monthlyIncome ?? undefined,
      savingsPercentage: options.savingsPercentage ?? undefined,
    },
    create: {
      userId,
      monthlyIncome,
      savingsPercentage,
    },
  });

  const existingCategories = await client.category.findMany({
    where: { userId },
  });

  const existingCategoryKeys = new Set(
    existingCategories.map((category) => `${category.name}:${category.type}`)
  );

  const createdCategories = await Promise.all(
    DEFAULT_CATEGORY_TEMPLATES.filter(
      (category) => !existingCategoryKeys.has(`${category.name}:${category.type}`)
    ).map((category) =>
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

  const categories = [...existingCategories, ...createdCategories];

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

  if (options.includeSampleTransactions === false) {
    return;
  }

  const existingTransactions = await client.transaction.count({
    where: { userId },
  });

  if (existingTransactions > 0) {
    return;
  }

  const categoryMap = new Map(
    categories.map((category) => [`${category.name}:${category.type}`, category.id])
  );

  const sampleTransactions = DEFAULT_TRANSACTION_TEMPLATES.reduce<
    Array<{
      amount: number;
      description: string;
      type: 'income' | 'expense' | 'savings';
      categoryId: string;
      userId: string;
      date: Date;
    }>
  >((rows, transaction) => {
    const categoryId = categoryMap.get(`${transaction.categoryName}:${transaction.type}`);

    if (!categoryId) {
      return rows;
    }

    rows.push({
      amount: transaction.amount,
      description: transaction.description,
      type: transaction.type,
      categoryId,
      userId,
      date: new Date(now.getTime() - transaction.daysAgo * 24 * 60 * 60 * 1000),
    });

    return rows;
  }, []);

  if (sampleTransactions.length === 0) {
    return;
  }

  await client.transaction.createMany({
    data: sampleTransactions,
  });
}
