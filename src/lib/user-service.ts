import bcrypt from 'bcryptjs';
import prisma from './db';
import { provisionUserDefaults } from './user-provisioning';

const PASSWORD_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const PASSWORD_SALT_ROUNDS = 12;

interface CreateUserInput {
  username: string;
  password: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  monthlyIncome?: number;
  savingsPercentage?: number;
}

export function isPasswordHash(password: string) {
  return PASSWORD_HASH_PATTERN.test(password);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function normalizeOptionalText(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export async function createUserWithDefaults(input: CreateUserInput) {
  const hashedPassword = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: input.username.trim(),
        password: hashedPassword,
        name: normalizeOptionalText(input.name),
        email: normalizeOptionalText(input.email),
        role: input.role ?? 'user',
      },
    });

    await provisionUserDefaults(tx, user.id, {
      monthlyIncome: input.monthlyIncome,
      savingsPercentage: input.savingsPercentage,
    });

    return user;
  });
}
