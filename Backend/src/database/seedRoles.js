import prisma from '../database/prismaClient.js';

/**
 * Seed default roles
 */
async function seedRoles() {
    console.log('🌱 Seeding roles...');

    const roles = [
        {
            name: 'Organization Admin',
            type: 'ORG_ADMIN',
            description: 'Full access within their organization',
            permissions: [
                'org:read', 'org:write', 'org:delete', 'org:manage', 'org:invite',
                'pentest:read', 'pentest:write', 'pentest:delete', 'pentest:manage',
                'finding:read', 'finding:write', 'finding:delete', 'finding:verify',
                'report:read',
                'user:read', 'user:write', 'user:manage',
                'ai:read', 'ai:write', 'ai:manage',
                'audit:read',
                'role:read', 'role:write', 'role:assign',
            ],
        },
        {
            name: 'Project Admin',
            type: 'PROJECT_ADMIN',
            description: 'Project/pentest lead (scoped permissions)',
            permissions: [
                'pentest:read', 'pentest:write', 'pentest:manage',
                'finding:read', 'finding:write', 'finding:delete', 'finding:verify',
                'report:read', 'report:generate',
                'ai:read', 'ai:write',
                'org:read',
                'user:read',
                'audit:read',
            ],
        },
        {
            name: 'Pentester',
            type: 'PENTESTER',
            description: 'Can perform penetration tests and manage findings',
            permissions: [
                'pentest:read', 'pentest:write',
                'finding:read', 'finding:write', 'finding:delete',
                'ai:read', 'ai:write',
                'org:read', 'user:read',
            ],
        },
    ];

    for (const role of roles) {
        const existing = await prisma.role.findUnique({
            where: { type: role.type },
        });

        if (existing) {
            console.log(`✓ Role ${role.name} already exists`);
            // Update permissions if they've changed
            await prisma.role.update({
                where: { type: role.type },
                data: { permissions: role.permissions },
            });
        } else {
            await prisma.role.create({ data: role });
            console.log(`✓ Created role: ${role.name}`);
        }
    }

    console.log('✅ Roles seeded successfully!');
}

seedRoles()
    .catch((error) => {
        console.error('❌ Error seeding roles:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
