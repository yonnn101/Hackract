import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: true,
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });
    console.log("USERS AND MEMBERSHIPS:");
    console.log(JSON.stringify(users, null, 2));

    const orgs = await prisma.organization.findMany();
    console.log("\nALL ORGANIZATIONS:");
    console.log(JSON.stringify(orgs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
