-- Finku Database Schema for Supabase
-- Copy-paste seluruh isi file ini ke Supabase SQL Editor

-- 1. Buat tabel User
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Buat tabel UserSettings
CREATE TABLE IF NOT EXISTS "UserSettings" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "monthlyIncome" FLOAT DEFAULT 0,
  "savingsPercentage" FLOAT DEFAULT 20,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "userId" TEXT UNIQUE REFERENCES "User"(id) ON DELETE CASCADE
);

-- 3. Buat tabel Category
CREATE TABLE IF NOT EXISTS "Category" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  budget FLOAT,
  "allocationPercentage" FLOAT DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. Buat index untuk Category
CREATE INDEX IF NOT EXISTS "Category_type_idx" ON "Category"(type);

-- 5. Buat tabel Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  amount FLOAT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "categoryId" TEXT NOT NULL REFERENCES "Category"(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

-- 6. Buat index untuk Transaction
CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"(type);
CREATE INDEX IF NOT EXISTS "Transaction_date_idx" ON "Transaction"(date);
CREATE INDEX IF NOT EXISTS "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");

-- 7. Buat tabel Budget
CREATE TABLE IF NOT EXISTS "Budget" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  amount FLOAT NOT NULL,
  period TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "categoryId" TEXT NOT NULL REFERENCES "Category"(id) ON DELETE CASCADE,
  UNIQUE("categoryId", month, year)
);

-- 8. Insert user admin default
-- Password: 94621732 (plain text - sesuai dengan login system)
INSERT INTO "User" (id, username, password, name, email, role)
VALUES (
  'admin-user-001',
  'admin',
  '94621732',
  'Administrator',
  'admin@finku.id',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- 9. Insert kategori default
INSERT INTO "Category" (id, name, icon, color, type, budget, "allocationPercentage") VALUES
-- Income categories
('cat-salary', 'Gaji', 'Wallet', '#10B981', 'income', NULL, 0),
('cat-freelance', 'Freelance', 'Laptop', '#3B82F6', 'income', NULL, 0),
('cat-investment', 'Investasi', 'TrendingUp', '#8B5CF6', 'income', NULL, 0),
('cat-bonus', 'Bonus', 'Gift', '#F59E0B', 'income', NULL, 0),
('cat-other-income', 'Pemasukan Lainnya', 'Plus', '#6B7280', 'income', NULL, 0),

-- Expense categories
('cat-food', 'Makanan & Minuman', 'UtensilsCrossed', '#EF4444', 'expense', 2000000, 20),
('cat-transport', 'Transportasi', 'Car', '#F97316', 'expense', 1000000, 10),
('cat-shopping', 'Belanja', 'ShoppingBag', '#EC4899', 'expense', 1500000, 15),
('cat-bills', 'Tagihan & Utilitas', 'Receipt', '#8B5CF6', 'expense', 500000, 5),
('cat-entertainment', 'Hiburan', 'Gamepad2', '#06B6D4', 'expense', 500000, 5),
('cat-health', 'Kesehatan', 'Heart', '#10B981', 'expense', 300000, 3),
('cat-education', 'Pendidikan', 'GraduationCap', '#3B82F6', 'expense', 500000, 5),
('cat-other-expense', 'Pengeluaran Lainnya', 'MoreHorizontal', '#6B7280', 'expense', 200000, 2),

-- Savings categories
('cat-emergency', 'Dana Darurat', 'Shield', '#10B981', 'savings', NULL, 10),
('cat-vacation', 'Liburan', 'Plane', '#3B82F6', 'savings', NULL, 5),
('cat-house', 'Rumah', 'Home', '#8B5CF6', 'savings', NULL, 10),
('cat-car', 'Mobil', 'Car', '#F59E0B', 'savings', NULL, 5),
('cat-marriage', 'Menikah', 'Heart', '#EC4899', 'savings', NULL, 10)
ON CONFLICT DO NOTHING;

-- 10. Insert user settings default
INSERT INTO "UserSettings" ("userId", "monthlyIncome", "savingsPercentage")
VALUES ('admin-user-001', 10000000, 20)
ON CONFLICT ("userId") DO NOTHING;

-- 11. Insert budget default untuk bulan ini
INSERT INTO "Budget" (id, amount, period, month, year, "categoryId")
SELECT 
  'budget-' || id,
  COALESCE(budget, 0),
  'monthly',
  EXTRACT(MONTH FROM NOW())::int,
  EXTRACT(YEAR FROM NOW())::int,
  id
FROM "Category"
WHERE type = 'expense' AND budget IS NOT NULL
ON CONFLICT DO NOTHING;

-- Done! Semua tabel dan data default sudah dibuat
