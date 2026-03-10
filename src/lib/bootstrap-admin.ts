import type { PrismaClient } from '@prisma/client';
import type { BootstrapAdminConfig } from './env';
import { hashPassword, normalizeOptionalText } from './user-service';
import { provisionUserDefaults } from './user-provisioning';

interface BootstrapAdminOptions {
  monthlyIncome?: number;
  savingsPercentage?: number;
}

export async function upsertBootstrapAdmin(
  client: PrismaClient,
  config: BootstrapAdminConfig,
  options: BootstrapAdminOptions = {}
) {
  const hashedPassword = await hashPassword(config.password);

  return client.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { username: config.username },
      update: {
        password: hashedPassword,
        name: normalizeOptionalText(config.name),
        email: normalizeOptionalText(config.email),
        role: 'admin',
      },
      create: {
        username: config.username,
        password: hashedPassword,
        name: normalizeOptionalText(config.name),
        email: normalizeOptionalText(config.email),
        role: 'admin',
      },
    });

    await provisionUserDefaults(tx, user.id, {
      monthlyIncome: options.monthlyIncome,
      savingsPercentage: options.savingsPercentage,
    });

    return user;
  });
}
