import prisma from '../src/database/prismaClient.js';

async function inspect() {
  try {
    const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true, fullName: true } });
    const orgs = await prisma.organization.findMany({ take: 5, select: { id: true, name: true } });
    console.log("USERS:", JSON.stringify(users, null, 2));
    console.log("ORGS:", JSON.stringify(orgs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
inspect();
