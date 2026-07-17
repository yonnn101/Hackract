import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.hackerProfile.findMany({
    include: { user: true }
  });
  console.log('Total Profiles:', profiles.length);
  profiles.forEach(p => {
    console.log(`- ${p.user.handle}: ${p.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
