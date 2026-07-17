import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Find an organization to connect to
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.log("No organization found. Please create one first.");
        return;
    }

    console.log(`Using organization: ${org.name} (${org.id})`);

    const project = await prisma.pentest.create({
      data: {
        name: "Test Project " + Date.now(),
        description: "Test description",
        organization: { connect: { id: org.id } },
        status: "PLANNING",
        targetDomains: ["example.com"],
        ipRanges: ["1.1.1.1"],
        excludedAssets: "none",
        workflows: {
          create: {
            name: "Test Workflow",
            nodes: [],
            edges: [],
          },
        },
      },
    });
    console.log("Project created successfully:", project.id);
  } catch (e) {
    console.error("Failed to create project:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
