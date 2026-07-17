import 'dotenv/config';
import prisma from '../src/database/prismaClient.js';

try {
  const deletedAgents = await prisma.aiAgent.deleteMany({
    where: { name: 'Stream Smoke Test Agent' },
  });

  const deletedAssistants = await prisma.aiAssistant.deleteMany({
    where: {
      name: {
        startsWith: 'Stream Smoke Assistant ',
      },
    },
  });

  console.log('CLEANUP_OK', JSON.stringify({
    deletedAgents: deletedAgents.count,
    deletedAssistants: deletedAssistants.count,
  }));
} catch (err) {
  console.error('CLEANUP_FAIL', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
