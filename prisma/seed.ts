import prisma from '../src/lib/db';
import { upsertBootstrapAdmin } from '../src/lib/bootstrap-admin';
import { getBootstrapAdminConfig } from '../src/lib/env';

async function main() {
  console.log('Starting safe seed...');

  const config = getBootstrapAdminConfig();
  if (!config) {
    console.log(
      'No bootstrap admin env configured. Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD to seed an admin.'
    );
    return;
  }

  const admin = await upsertBootstrapAdmin(prisma, config);
  console.log(`Admin ready with template data: ${admin.username} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
