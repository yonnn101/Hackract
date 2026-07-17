import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding legal agreements...');

  const agreements = [
    {
      title: 'Mutual Non-Disclosure Agreement (MNDA)',
      version: '1.0.0',
      type: 'mnda',
      content: `
# Mutual Non-Disclosure Agreement (MNDA)

This agreement is made between Hackract and the Operator (Pentester).

1. **Definition of Confidential Information**: Confidential information includes all business, technical, and security data shared during a project.
2. **Obligations**: The Operator agrees not to disclose, share, or misuse any confidential information obtained through the platform.
3. **Term**: This agreement remains in effect indefinitely regarding security vulnerabilities found.
4. **Governing Law**: This agreement is governed by the laws of the platform's jurisdiction.

By signing, you agree to these terms.
      `,
      isActive: true,
    },
    {
      title: 'Ethical Hacking Code of Conduct',
      version: '1.0.0',
      type: 'code_of_conduct',
      content: `
# Ethical Hacking Code of Conduct

As a Hackract Operator, I agree to the following:

1. **Do No Harm**: I will only perform tests within the explicitly defined scope.
2. **Transparency**: I will report all findings immediately and accurately.
3. **Authorized Access Only**: I will never attempt to access data outside my assigned engagement.
4. **Legality**: I will follow all local and international laws regarding cybersecurity.

Failure to comply will result in immediate termination and potential legal action.
      `,
      isActive: true,
    }
  ];

  for (const agreement of agreements) {
    await prisma.legalAgreement.upsert({
      where: {
        title_version: {
          title: agreement.title,
          version: agreement.version,
        },
      },
      update: agreement,
      create: agreement,
    });
    console.log(`Upserted: ${agreement.title} (v${agreement.version})`);
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
