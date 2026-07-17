import prisma from './src/database/prismaClient.js';

async function test() {
  try {
    const project = await prisma.pentest.create({
      data: {
        name: "Test Audit",
        organizationId: "0c3c8e32-f12e-486e-9ab5-dd2b86fd2c0f",
        workflows: {
          create: {
            name: "Test - Main Workflow",
            nodes: [
              { id: 'node-1', type: 'customNode', position: { x: 100, y: 150 }, data: { label: 'Reconnaissance', status: 'pending' } }
            ],
            edges: []
          }
        },
        projectAgreements: {
          create: {
            title: "Standard NDA",
            version: 1,
            body: "test body",
            createdById: "0c3c8e32-f12e-486e-9ab5-dd2b86fd2c0f"
          }
        }
      }
    });
    console.log("Success:", project.id);
  } catch (e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
