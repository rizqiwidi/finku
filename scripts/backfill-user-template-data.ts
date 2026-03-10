import prisma from '../src/lib/db';
import { provisionUserDefaults } from '../src/lib/user-provisioning';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('No users found. Nothing to backfill.');
    return;
  }

  for (const user of users) {
    await prisma.$transaction(async (tx) => {
      await provisionUserDefaults(tx, user.id);
    });

    console.log(`Template data ensured for ${user.username} (${user.id})`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to backfill user template data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
