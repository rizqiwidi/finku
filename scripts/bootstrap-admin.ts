import prisma from '../src/lib/db';
import { getBootstrapAdminConfig } from '../src/lib/env';
import { upsertBootstrapAdmin } from '../src/lib/bootstrap-admin';

async function main() {
  const config = getBootstrapAdminConfig();

  if (!config) {
    throw new Error(
      'Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD before running this script.'
    );
  }

  const admin = await upsertBootstrapAdmin(prisma, config);
  console.log(`Bootstrap admin ready: ${admin.username} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error('Failed to bootstrap admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
