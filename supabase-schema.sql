-- Finku Database Schema for Supabase
-- Shared single database with per-user isolation via userId
-- For existing databases, prefer Prisma db push/migrations over copy-pasting this file.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserSettings" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "monthlyIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "savingsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Category" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  budget DOUBLE PRECISION,
  "allocationPercentage" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "categoryId" TEXT NOT NULL REFERENCES "Category"(id) ON DELETE RESTRICT,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Budget" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount DOUBLE PRECISION NOT NULL,
  period TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "categoryId" TEXT NOT NULL REFERENCES "Category"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "Budget_userId_categoryId_month_year_key" UNIQUE ("userId", "categoryId", month, year)
);

CREATE INDEX IF NOT EXISTS "Category_userId_type_idx" ON "Category"("userId", type);
CREATE INDEX IF NOT EXISTS "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", date);
CREATE INDEX IF NOT EXISTS "Transaction_userId_type_date_idx" ON "Transaction"("userId", type, date);
CREATE INDEX IF NOT EXISTS "Budget_userId_month_year_idx" ON "Budget"("userId", month, year);

-- No default users, passwords, or shared categories are inserted here.
-- After schema creation:
-- 1. Set ADMIN_BOOTSTRAP_* env vars in your local shell or deployment environment.
-- 2. Run `bun run admin:bootstrap` once to create the first admin safely.
