import prisma from '../src/database/prismaClient.js';

async function main() {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        pentest: { select: { name: true } }
      }
    });
    console.log(`Found ${workflows.length} workflows:`);
    workflows.forEach(w => {
      console.log(`- ID: ${w.id}, Name: ${w.name}, Project: ${w.pentest?.name || 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
