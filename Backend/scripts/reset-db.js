import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB RESET STARTED ---');

    try {
        const models = [
            'workflowHistory',
            'workflow',
            'finding',
            'pentestCollaborator',
            'pentest',
            'organizationMember',
            'organization',
            'refreshToken',
            'passwordResetToken',
            'emailVerificationToken',
            'hackerProfile',
            'userSignature',
            'auditLog',
            'aiAgent',
            'user'
        ];

        for (const model of models) {
            if (prisma[model]) {
                console.log(`Clearing ${model}...`);
                await prisma[model].deleteMany();
            } else {
                console.warn(`Model ${model} not found in Prisma client, skipping.`);
            }
        }

        console.log('--- DB RESET COMPLETED SUCCESSFULLY ---');
        console.log('All accounts and users have been removed.');
    } catch (error) {
        console.error('--- DB RESET FAILED ---');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
