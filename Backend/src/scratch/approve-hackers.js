import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.hackerProfile.updateMany({
    where: { status: 'SUBMITTED' },
    data: { status: 'APPROVED' }
  });
  console.log(`Approved ${result.count} hackers.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
