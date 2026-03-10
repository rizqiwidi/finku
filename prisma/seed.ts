import prisma from '../src/lib/db';
import { upsertBootstrapAdmin } from '../src/lib/bootstrap-admin';
import { getBootstrapAdminConfig } from '../src/lib/env';

const sampleTransactions = [
  { description: 'Gaji Bulanan', amount: 15000000, type: 'income', categoryName: 'Gaji', daysAgo: 25 },
  { description: 'Project Website', amount: 5000000, type: 'income', categoryName: 'Freelance', daysAgo: 15 },
  { description: 'Dividen Saham', amount: 500000, type: 'income', categoryName: 'Investasi', daysAgo: 10 },
  { description: 'Bonus', amount: 2000000, type: 'income', categoryName: 'Lainnya', daysAgo: 5 },
  { description: 'Makan Siang', amount: 45000, type: 'expense', categoryName: 'Makanan', daysAgo: 0 },
  { description: 'Groceries', amount: 350000, type: 'expense', categoryName: 'Makanan', daysAgo: 2 },
  { description: 'Gojek ke Kantor', amount: 25000, type: 'expense', categoryName: 'Transportasi', daysAgo: 1 },
  { description: 'Bensin', amount: 150000, type: 'expense', categoryName: 'Transportasi', daysAgo: 5 },
  { description: 'Baju Baru', amount: 450000, type: 'expense', categoryName: 'Belanja', daysAgo: 7 },
  { description: 'Netflix', amount: 54000, type: 'expense', categoryName: 'Hiburan', daysAgo: 20 },
  { description: 'Spotify', amount: 54990, type: 'expense', categoryName: 'Hiburan', daysAgo: 20 },
  { description: 'Listrik', amount: 350000, type: 'expense', categoryName: 'Tagihan', daysAgo: 15 },
  { description: 'Internet', amount: 450000, type: 'expense', categoryName: 'Tagihan', daysAgo: 12 },
  { description: 'Vitamin', amount: 150000, type: 'expense', categoryName: 'Kesehatan', daysAgo: 8 },
  { description: 'Kursus Online', amount: 500000, type: 'expense', categoryName: 'Pendidikan', daysAgo: 18 },
  { description: 'Tabungan Dana Darurat', amount: 1500000, type: 'savings', categoryName: 'Dana Darurat', daysAgo: 25 },
  { description: 'Investasi Bulanan', amount: 1500000, type: 'savings', categoryName: 'Investasi', daysAgo: 25 },
] as const;

async function seedSampleTransactions(userId: string) {
  const existingTransactions = await prisma.transaction.count({
    where: { userId },
  });

  if (existingTransactions > 0) {
    console.log('Sample transactions already exist. Skipping transaction seed.');
    return;
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const categoryMap = new Map(
    categories.map((category) => [`${category.name}:${category.type}`, category.id])
  );

  const now = new Date();
  let insertedCount = 0;

  for (const transaction of sampleTransactions) {
    const categoryId = categoryMap.get(`${transaction.categoryName}:${transaction.type}`);

    if (!categoryId) {
      continue;
    }

    const date = new Date(now.getTime() - transaction.daysAgo * 24 * 60 * 60 * 1000);

    await prisma.transaction.create({
      data: {
        amount: transaction.amount,
        description: transaction.description,
        type: transaction.type,
        categoryId,
        userId,
        date,
      },
    });

    insertedCount += 1;
  }

  console.log(`Seeded ${insertedCount} sample transaction(s).`);
}

async function main() {
  console.log('Starting safe seed...');

  const config = getBootstrapAdminConfig();
  if (!config) {
    console.log(
      'No bootstrap admin env configured. Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD to seed an admin.'
    );
    return;
  }

  const withSampleData = process.env.SEED_SAMPLE_DATA === 'true';
  const admin = await upsertBootstrapAdmin(prisma, config, {
    monthlyIncome: withSampleData ? 15000000 : 0,
    savingsPercentage: 20,
  });

  console.log(`Admin ready: ${admin.username} (${admin.id})`);

  if (!withSampleData) {
    console.log('Sample data skipped. Set SEED_SAMPLE_DATA=true if you need demo transactions.');
    return;
  }

  await seedSampleTransactions(admin.id);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
