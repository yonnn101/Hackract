import fs from 'fs';
import path from 'path';
import prisma from '../src/database/prismaClient.js';
import { generatePdfReport } from '../src/modules/Report/report.service.js';

async function main() {
  try {
    const project = await prisma.pentest.findFirst();
    if (!project) {
      console.log('No project found in database to test.');
      return;
    }
    
    console.log(`Generating report for project: ${project.name} (${project.id})...`);
    const buffer = await generatePdfReport(project.id, {
      execSummary: true,
      techScope: true,
      vulnMatrix: true,
      remedPath: true
    });
    
    const outputPath = path.resolve(process.cwd(), 'scratch', 'test.pdf');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Success! Report generated successfully at: ${outputPath}`);
    console.log(`Buffer size: ${buffer.length} bytes`);
  } catch (error) {
    console.error('❌ Error during report generation test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
