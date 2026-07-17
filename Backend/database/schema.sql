-- ============================
-- Extensions
-- ============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================
-- Enums (UPPERCASE to match Prisma)
-- ============================
CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'Suspended', 'BANNED');
CREATE TYPE pentest_status AS ENUM ('PLANNING', 'IN_PROGRESS', 'REPORTING', 'CLOSED');
CREATE TYPE finding_severity AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE finding_status AS ENUM ('OPEN', 'VERIFIED', 'FIXED', 'ACCEPTED_RISK');
CREATE TYPE role_type AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER');

-- =====================================================
-- 1️⃣ USERS
-- =====================================================
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  handle CITEXT UNIQUE NOT NULL,
  status user_status DEFAULT 'PENDING',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2️⃣ ROLES
-- =====================================================
CREATE TABLE "Role" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  type role_type UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Role many-to-many junction table
CREATE TABLE "_UserToRole" (
  "A" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "B" UUID REFERENCES "Role"(id) ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

-- =====================================================
-- 3️⃣ ORGANIZATIONS
-- =====================================================
CREATE TABLE "Organization" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug CITEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, slug)
);

-- =====================================================
-- 4️⃣ ORGANIZATION MEMBERS
-- =====================================================
CREATE TABLE "OrganizationMember" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES "Organization"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  can_create_pentests BOOLEAN DEFAULT FALSE,
  can_invite_members BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- =====================================================
-- 5️⃣ PENTESTS
-- =====================================================
CREATE TABLE "Pentest" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES "Organization"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status pentest_status DEFAULT 'PLANNING',
  lead_pentester_id UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6️⃣ PENTEST COLLABORATORS
-- =====================================================
CREATE TABLE "PentestCollaborator" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pentest_id UUID REFERENCES "Pentest"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborator',
  can_edit_findings BOOLEAN DEFAULT FALSE,
  can_manage_sessions BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pentest_id, user_id)
);

-- =====================================================
-- 7️⃣ FINDINGS
-- =====================================================
CREATE TABLE "Finding" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pentest_id UUID REFERENCES "Pentest"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity finding_severity DEFAULT 'LOW',
  status finding_status DEFAULT 'OPEN',
  remediation TEXT,
  proof TEXT,
  reporter_id UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8️⃣ LEGAL AGREEMENTS
-- =====================================================
CREATE TABLE "LegalAgreement" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT DEFAULT 'terms_of_service',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (title, version)
);

-- =====================================================
-- 9️⃣ USER SIGNATURES
-- =====================================================
CREATE TABLE "UserSignature" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES "LegalAgreement"(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, agreement_id)
);

-- =====================================================
-- 🔟 AI ASSISTANTS 🤖
-- =====================================================
CREATE TABLE "AiAssistant" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 1️⃣1️⃣ AI AGENTS (replaces ai_sessions)
-- =====================================================
CREATE TABLE "AiAgent" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assistant_id UUID REFERENCES "AiAssistant"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  pentest_id UUID REFERENCES "Pentest"(id) ON DELETE SET NULL,
  name TEXT,
  messages JSONB,
  tokens_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 1️⃣2️⃣ AUDIT LOGS
-- =====================================================
CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES "Organization"(id) ON DELETE SET NULL,
  user_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
  pentest_id UUID REFERENCES "Pentest"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- Indexes
-- ============================
-- User indexes
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_handle ON "User"(handle);
CREATE INDEX idx_user_status ON "User"(status);

-- Role indexes
CREATE INDEX idx_role_type ON "Role"(type);

-- OrganizationMember indexes
CREATE INDEX idx_org_member_org ON "OrganizationMember"(organization_id);
CREATE INDEX idx_org_member_user ON "OrganizationMember"(user_id);

-- Pentest indexes
CREATE INDEX idx_pentest_org ON "Pentest"(organization_id);
CREATE INDEX idx_pentest_lead ON "Pentest"(lead_pentester_id);
CREATE INDEX idx_pentest_status ON "Pentest"(status);

-- PentestCollaborator indexes
CREATE INDEX idx_pentest_collab_pentest ON "PentestCollaborator"(pentest_id);
CREATE INDEX idx_pentest_collab_user ON "PentestCollaborator"(user_id);

-- Finding indexes
CREATE INDEX idx_finding_pentest ON "Finding"(pentest_id);
CREATE INDEX idx_finding_severity ON "Finding"(severity);
CREATE INDEX idx_finding_status ON "Finding"(status);

-- AiAgent indexes
CREATE INDEX idx_ai_agent_user ON "AiAgent"(user_id);
CREATE INDEX idx_ai_agent_pentest ON "AiAgent"(pentest_id);
CREATE INDEX idx_ai_agent_assistant ON "AiAgent"(assistant_id);

-- AuditLog indexes
CREATE INDEX idx_audit_log_user ON "AuditLog"(user_id);
CREATE INDEX idx_audit_log_org ON "AuditLog"(organization_id);
CREATE INDEX idx_audit_log_pentest ON "AuditLog"(pentest_id);
CREATE INDEX idx_audit_log_created ON "AuditLog"(created_at);

-- ============================
-- Triggers for updated_at
-- ============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_updated_at BEFORE UPDATE ON "Role"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON "Organization"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pentest_updated_at BEFORE UPDATE ON "Pentest"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finding_updated_at BEFORE UPDATE ON "Finding"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_agreement_updated_at BEFORE UPDATE ON "LegalAgreement"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_assistant_updated_at BEFORE UPDATE ON "AiAssistant"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_updated_at BEFORE UPDATE ON "AiAgent"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================
-- Default Seed Data
-- ============================
INSERT INTO "Role" (id, name, type, description, permissions, created_at) VALUES
(uuid_generate_v4(), 'Super Admin', 'SUPER_ADMIN', 'Full system access with all permissions', ARRAY['*'], NOW()),
(uuid_generate_v4(), 'Organization Admin', 'ORG_ADMIN', 'Full access within their organization', ARRAY[
  'org:read', 'org:write', 'org:manage', 'org:invite',
  'pentest:read', 'pentest:write', 'pentest:delete', 'pentest:manage',
  'finding:read', 'finding:write', 'finding:delete', 'finding:verify',
  'user:read', 'ai:read', 'ai:write', 'ai:manage',
  'audit:read', 'role:read'
], NOW()),
(uuid_generate_v4(), 'Project Admin', 'PROJECT_ADMIN', 'Project/pentest lead (scoped permissions)', ARRAY[
  'pentest:read', 'pentest:write', 'pentest:manage',
  'finding:read', 'finding:write', 'finding:delete', 'finding:verify',
  'ai:read', 'ai:write',
  'org:read', 'user:read',
  'audit:read'
], NOW()),
(uuid_generate_v4(), 'Pentester', 'PENTESTER', 'Can perform penetration tests and manage findings', ARRAY[
  'pentest:read', 'pentest:write',
  'finding:read', 'finding:write', 'finding:delete',
  'ai:read', 'ai:write',
  'org:read', 'user:read'
], NOW());

INSERT INTO "AiAssistant" (id, name, model, system_prompt, capabilities, temperature, max_tokens, is_active, created_at) VALUES
(uuid_generate_v4(), 'Hackract Security Assistant', 'gpt-4-turbo', 'You are a cybersecurity assistant specialized in penetration testing and vulnerability analysis.', ARRAY['vulnerability_analysis', 'report_generation', 'tool_recommendation', 'code_review'], 0.7, 4000, true, NOW());

-- ============================
-- Comments for Documentation
-- ============================
COMMENT ON TABLE "User" IS 'System users with authentication details';
COMMENT ON TABLE "Role" IS 'User roles and permissions';
COMMENT ON TABLE "Organization" IS 'Companies/teams using the platform';
COMMENT ON TABLE "OrganizationMember" IS 'Users membership in organizations';
COMMENT ON TABLE "Pentest" IS 'Penetration testing engagements';
COMMENT ON TABLE "PentestCollaborator" IS 'Team members assigned to pentests';
COMMENT ON TABLE "Finding" IS 'Security vulnerabilities found during pentests';
COMMENT ON TABLE "LegalAgreement" IS 'Terms of service, privacy policies, etc.';
COMMENT ON TABLE "UserSignature" IS 'User signatures for legal agreements';
COMMENT ON TABLE "AiAssistant" IS 'AI assistant configurations';
COMMENT ON TABLE "AiAgent" IS 'Active AI assistant sessions';
COMMENT ON TABLE "AuditLog" IS 'System audit trail for security';

-- ============================
-- Grant Permissions (if needed)
-- ============================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;