import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  // Income categories
  { name: 'Gaji', icon: 'Wallet', color: '#10b981', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income' },
  { name: 'Investasi', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' },
  { name: 'Lainnya', icon: 'Plus', color: '#6b7280', type: 'income' },
  
  // Expense categories
  { name: 'Makanan', icon: 'Utensils', color: '#f97316', type: 'expense', budget: 3000000, allocationPercentage: 15 },
  { name: 'Transportasi', icon: 'Car', color: '#3b82f6', type: 'expense', budget: 1500000, allocationPercentage: 10 },
  { name: 'Belanja', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', budget: 2000000, allocationPercentage: 12 },
  { name: 'Hiburan', icon: 'Gamepad2', color: '#14b8a6', type: 'expense', budget: 1000000, allocationPercentage: 8 },
  { name: 'Tagihan', icon: 'Receipt', color: '#ef4444', type: 'expense', budget: 2500000, allocationPercentage: 15 },
  { name: 'Kesehatan', icon: 'Heart', color: '#f43f5e', type: 'expense', budget: 500000, allocationPercentage: 5 },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#6366f1', type: 'expense', budget: 1000000, allocationPercentage: 10 },
  { name: 'Lainnya', icon: 'MoreHorizontal', color: '#9ca3af', type: 'expense', budget: 500000, allocationPercentage: 5 },
  
  // Savings categories
  { name: 'Dana Darurat', icon: 'Shield', color: '#0ea5e9', type: 'savings', allocationPercentage: 10 },
  { name: 'Investasi', icon: 'TrendingUp', color: '#22c55e', type: 'savings', allocationPercentage: 10 },
];

const sampleTransactions = [
  // Income transactions
  { description: 'Gaji Bulanan', amount: 15000000, type: 'income', categoryName: 'Gaji', daysAgo: 25 },
  { description: 'Project Website', amount: 5000000, type: 'income', categoryName: 'Freelance', daysAgo: 15 },
  { description: 'Dividen Saham', amount: 500000, type: 'income', categoryName: 'Investasi', daysAgo: 10 },
  { description: 'Bonus', amount: 2000000, type: 'income', categoryName: 'Lainnya', daysAgo: 5 },
  
  // Expense transactions
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
  
  // Savings transactions
  { description: 'Tabungan Dana Darurat', amount: 1500000, type: 'savings', categoryName: 'Dana Darurat', daysAgo: 25 },
  { description: 'Investasi Bulanan', amount: 1500000, type: 'savings', categoryName: 'Investasi', daysAgo: 25 },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🗑️ Cleaning existing data...');
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Create admin user with hashed password
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('94621732', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      email: 'admin@finku.id',
      role: 'admin',
    },
  });

  // Create user settings
  await prisma.userSettings.create({
    data: {
      userId: admin.id,
      monthlyIncome: 15000000,
      savingsPercentage: 20,
    },
  });

  // Create categories
  console.log('📁 Creating categories...');
  const createdCategories = await Promise.all(
    categories.map((category) =>
      prisma.category.create({
        data: category,
      })
    )
  );

  // Create budgets for expense categories
  console.log('💰 Creating budgets...');
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const expenseCategories = createdCategories.filter((c) => c.type === 'expense' && c.budget);
  await Promise.all(
    expenseCategories.map((category) =>
      prisma.budget.create({
        data: {
          categoryId: category.id,
          amount: category.budget!,
          period: 'monthly',
          month: currentMonth,
          year: currentYear,
        },
      })
    )
  );

  // Create sample transactions
  console.log('💳 Creating sample transactions...');
  const categoryMap = new Map(createdCategories.map((c) => [c.name, c]));

  await Promise.all(
    sampleTransactions.map((t) => {
      const category = categoryMap.get(t.categoryName);
      if (!category) return null;
      
      const date = new Date(now.getTime() - t.daysAgo * 24 * 60 * 60 * 1000);
      
      return prisma.transaction.create({
        data: {
          amount: t.amount,
          description: t.description,
          type: t.type,
          categoryId: category.id,
          userId: admin.id,
          date,
        },
      });
    })
  );

  console.log('✅ Seed completed!');
  console.log(`   - 1 admin user created (username: admin, password: 94621732)`);
  console.log(`   - ${createdCategories.length} categories created`);
  console.log(`   - ${expenseCategories.length} budgets created`);
  console.log(`   - ${sampleTransactions.length} transactions created`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
