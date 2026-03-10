import prisma from '../src/lib/db';
import { hashPassword, isPasswordHash } from '../src/lib/user-service';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      password: true,
    },
  });

  const plaintextUsers = users.filter((user) => !isPasswordHash(user.password));

  if (plaintextUsers.length === 0) {
    console.log('No plaintext passwords found.');
    return;
  }

  for (const user of plaintextUsers) {
    const hashedPassword = await hashPassword(user.password);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`Migrated password hash for ${user.username}`);
  }

  console.log(`Migrated ${plaintextUsers.length} user password(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to migrate password hashes:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
