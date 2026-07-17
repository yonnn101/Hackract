/**
 * Dev utility: inspect hacker profiles in the DB and optionally approve them all.
 * Usage:
 *   node scripts/approveHackers.js          ← shows counts only
 *   node scripts/approveHackers.js --approve ← approves all non-APPROVED profiles
 *   node scripts/approveHackers.js --seed    ← seeds 3 sample profiles then approves
 */

import prisma from '../src/database/prismaClient.js';

const doApprove = process.argv.includes('--approve') || process.argv.includes('--seed');
const doSeed    = process.argv.includes('--seed');

async function main() {
  // ── 1. Show current state ────────────────────────────────────────
  const allProfiles = await prisma.hackerProfile.findMany({
    include: { user: { select: { fullName: true, handle: true, email: true } } },
  });

  console.log(`\n📊 HackerProfile table: ${allProfiles.length} total row(s)\n`);

  const byStatus = {};
  for (const p of allProfiles) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    console.log(
      `  • [${p.status.padEnd(12)}] ${p.user?.fullName || 'N/A'} (@${p.user?.handle || 'N/A'}) — ${p.user?.email || 'N/A'}`,
    );
  }

  console.log('\nStatus breakdown:', byStatus);

  // ── 2. Seed sample profiles if requested ────────────────────────
  if (doSeed) {
    console.log('\n🌱 Seeding sample hacker profiles…');

    const pentesterRole = await prisma.role.findUnique({ where: { type: 'PENTESTER' } });
    if (!pentesterRole) {
      console.error('❌  No PENTESTER role found — run the server once first to auto-create it.');
      process.exit(1);
    }

    const samples = [
      {
        email: 'alice@hackract.dev', fullName: 'Alice Cipher', handle: 'alicecipher',
        bio: 'Web app and API security specialist with 6 years of bug bounty experience.',
        country: 'USA', yearsOfExperience: 6,
        primarySkills: ['Web Exploitation', 'API Security', 'OWASP Top 10'],
        certifications: ['OSCP', 'CEH'],
        specialization: 'Web Application Pentesting',
      },
      {
        email: 'bob@hackract.dev', fullName: 'Bob Netrunner', handle: 'bobnetrunner',
        bio: 'Network & cloud infrastructure pentester. AWS certified.',
        country: 'UK', yearsOfExperience: 4,
        primarySkills: ['Network Security', 'Cloud Security', 'AWS'],
        certifications: ['GPEN', 'CISSP'],
        specialization: 'Cloud Infrastructure',
      },
      {
        email: 'carol@hackract.dev', fullName: 'Carol Shellcode', handle: 'carolshell',
        bio: 'Reverse engineer and binary exploitation expert. CTF champion.',
        country: 'Germany', yearsOfExperience: 8,
        primarySkills: ['Binary Analysis', 'Reverse Engineering', 'Exploit Dev'],
        certifications: ['OSCE', 'GREM'],
        specialization: 'Binary Exploitation',
      },
    ];

    for (const s of samples) {
      // Find or create the user
      let user = await prisma.user.findUnique({ where: { email: s.email } });
      if (!user) {
        let handle = s.handle;
        // Ensure handle is unique
        while (await prisma.user.findUnique({ where: { handle } })) {
          handle = `${s.handle}${Date.now()}`;
        }
        user = await prisma.user.create({
          data: {
            email: s.email,
            fullName: s.fullName,
            handle,
            status: 'ACTIVE',
            isVerified: true,
            trustScore: 90,
            provider: 'local',
            roles: { connect: { id: pentesterRole.id } },
          },
        });
        console.log(`  ✅ Created user: ${user.fullName} (${user.email})`);
      } else {
        console.log(`  ℹ️  User already exists: ${user.email}`);
      }

      // Upsert the hacker profile
      await prisma.hackerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          bio: s.bio,
          country: s.country,
          yearsOfExperience: s.yearsOfExperience,
          primarySkills: s.primarySkills,
          certifications: s.certifications,
          specialization: s.specialization,
          portfolioLinks: [],
          status: 'APPROVED',
        },
        update: {
          status: 'APPROVED',
          primarySkills: s.primarySkills,
          certifications: s.certifications,
        },
      });
      console.log(`  ✅ Profile approved for: ${s.fullName}`);
    }
  }

  // 3. Approve existing profiles 
  if (doApprove && !doSeed) {
    const toApprove = allProfiles.filter(p => p.status !== 'APPROVED');
    if (toApprove.length === 0) {
      console.log('\n✅ All profiles are already APPROVED.');
    } else {
      const { count } = await prisma.hackerProfile.updateMany({
        where: { status: { not: 'APPROVED' } },
        data:  { status: 'APPROVED' },
      });
      console.log(`\n✅ Approved ${count} profile(s).`);
    }
  }

  //  4. Final count 
  const approvedCount = await prisma.hackerProfile.count({ where: { status: 'APPROVED' } });
  console.log(`\n🎯 APPROVED profiles in DB: ${approvedCount}`);
  console.log('Done.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
