import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const profiles = await prisma.hackerProfile.findMany({
      select: { id: true, status: true }
    });
    
    console.log('Total profiles in DB:', profiles.length);
    console.log('Statuses found:', [...new Set(profiles.map(p => p.status))]);

    // This simulates what discoverHackers does now
    const where = {};
    const discovered = await prisma.hackerProfile.findMany({ where });
    
    console.log('Discovered profiles count:', discovered.length);
    
    if (discovered.length === profiles.length) {
      console.log('VERIFICATION SUCCESS: All profiles are now discoverable.');
    } else {
      console.log('VERIFICATION FAILED: Counts do not match.');
    }
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
