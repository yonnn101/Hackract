import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const fan = process.argv[2];
    if (!fan) {
        console.error('Usage: node scripts/free-fan.mjs <FAN>');
        process.exit(1);
    }

    const citizen = await prisma.citizen.findUnique({ where: { fan } });
    if (!citizen) {
        console.log(`No citizen found for FAN ${fan}. Nothing to free.`);
        return;
    }

    const existing = await prisma.nationalIDVerification.findUnique({
        where: { citizenId: citizen.id },
    });

    if (!existing) {
        console.log(`Citizen ${citizen.id} has no linked NationalIDVerification. FAN already free.`);
        return;
    }

    await prisma.nationalIDVerification.delete({ where: { id: existing.id } });

    console.log(
        `Freed FAN ${fan}: removed NationalIDVerification ${existing.id} ` +
        `(was linked to user ${existing.userId}, status ${existing.verificationStatus}).`
    );
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
