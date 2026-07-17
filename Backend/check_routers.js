import express from "express";
import AuthRouter from "./src/modules/auth/auth.routes.js";
import UserRouter from "./src/modules/user/user.routes.js";
import RoleRouter from "./src/modules/Roles/roles.routes.js";
import OrganizationRouter from "./src/modules/Organization/Organization.routes.js";
import MemberRouter from "./src/modules/OrgMembers/member.routes.js";
import PentestRouter from "./src/modules/Pentest/pentest.routes.js";
import CollaboratorRouter from "./src/modules/PentestCollaborator/collaborator.routes.js";
import FindingRouter from "./src/modules/vulnerabilityFinding/finding.routes.js";
import AiAssistantRouter from "./src/modules/AiAssistant/assistant.routes.js";
import AiAgentRouter from "./src/modules/AiAgent/agent.routes.js";
import AuditLogRouter from "./src/modules/AuditLogs/auditLog.routes.js";
import LegalAgreementRouter from "./src/modules/LegalAgreement/legalAgreement.routes.js";
import UserSignatureRouter from "./src/modules/UserSignature/userSignature.routes.js";
import WorkflowRouter from "./src/modules/Workflow/workflow.routes.js";
import WorkflowHistoryRouter from "./src/modules/WorkflowHistory/workflowHistory.routes.js";
import HackerProfileRouter from "./src/modules/HackerProfile/hackerProfile.routes.js";
import ProjectRouter from "./src/modules/Project/project.routes.js";

const routers = {
  AuthRouter,
  UserRouter,
  RoleRouter,
  OrganizationRouter,
  MemberRouter,
  PentestRouter,
  CollaboratorRouter,
  FindingRouter,
  AiAssistantRouter,
  AiAgentRouter,
  AuditLogRouter,
  LegalAgreementRouter,
  UserSignatureRouter,
  WorkflowRouter,
  WorkflowHistoryRouter,
  HackerProfileRouter,
  ProjectRouter
};

for (const [name, router] of Object.entries(routers)) {
  if (router === undefined) {
    console.log(`❌ ${name} is undefined`);
  } else {
    console.log(`✅ ${name} is defined`);
  }
}
