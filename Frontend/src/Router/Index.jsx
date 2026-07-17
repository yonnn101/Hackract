// src/routes/index.jsx

import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import VerifyEmail from "../pages/VerifyEmail.jsx";
import Home from "../pages/Home.jsx";
import Landing from "../pages/Landing.jsx";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import HackerProfile from "../pages/HackerProfile.jsx";
import OrganizationProfile from "../pages/OrganizationProfile.jsx";
import WorkflowEditor from "../pages/WorkflowEditor/WorkflowEditor.jsx";
import HackerVerification from "../pages/HackerVerification.jsx";
import OrganizationVerification from "../pages/OrganizationVerification.jsx";
import ErrorPage from "../pages/ErrorPage.jsx";
import EthiopiaIDVerification from "../pages/EthiopiaIDVerification.jsx";


import Projects from "../pages/Projects.jsx";
import ProjectWorkspace from "../pages/ProjectWorkspace.jsx";
import FindingDetails from "../pages/FindingDetails.jsx";
import VulnerabilityFindings from "../pages/vulnerabilityFinding.jsx";
import HackerLayout from "../layouts/HackerLayout.jsx";
import OrganizationLayout from "../layouts/OrganizationLayout.jsx";
import ProjectAdminLayout from "../layouts/ProjectAdminLayout.jsx";
import OrganizationDashboard from "../pages/OrganizationDashboard.jsx";
import Reports from "../pages/Reports.jsx";
import AiAgentLogsPage from "../pages/AiAgentLogsPage.jsx";
import OrganizationDiscover from "../pages/OrganizationDiscover.jsx";
import HackerPublicProfile from "../pages/HackerPublicProfile.jsx";
import OrganizationProjects from "../pages/OrganizationProjects.jsx";
import OrganizationProjectWorkspace from "../pages/OrganizationProjectWorkspace.jsx";

// Phase 2 Marketplace Imports
import EngagementBoard from "../pages/EngagementBoard.jsx";

// Phase 17 Onboarding Imports
import OnboardingGuard from "../components/OnboardingGuard.jsx";
import RoleGuard from "../components/RoleGuard.jsx";
import { isOrgAdminMember } from "../utils/roles.js";
import OnboardingLayout from "../layouts/OnboardingLayout.jsx";
import HackerOnboarding from "../pages/Onboarding/HackerOnboarding.jsx";
import OrgOnboarding from "../pages/Onboarding/OrgOnboarding.jsx";

// Chat
import HackerChat from "../pages/HackerChat.jsx";
import OrganizationChat from "../pages/OrganizationChat.jsx";
// Agreement Execute
import AgreementExecute from "../pages/AgreementExecute.jsx";
import LegalAgreementCreate from "../pages/LegalAgreementCreate.jsx";
import LegalAgreementList from "../pages/LegalAgreementList.jsx";

// Phase 18 Admin Imports
import ApprovalsDashboard from "../pages/Admin/ApprovalsDashboard.jsx";
import OperatorReview from "../pages/Admin/OperatorReview.jsx";
import OrgReview from "../pages/Admin/OrgReview.jsx";
import SystemAdminDashboard from "../pages/Admin/SystemAdminDashboard.jsx";

// Optional (only if you really have this file)
import DashboardPreview from "../pages/DashboardPreview.jsx";

// 404 Route
import NotFound from "../pages/NotFound.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "preview-dashboard",
        element: <DashboardPreview />,
      },
      {
        index: true,
        element: <Landing />,
      },

      // ══════════════════════════════════════════════════════════════
      // PENTESTER routes  (green sidebar layout)
      // ══════════════════════════════════════════════════════════════
      {
        element: (
          <OnboardingGuard>
            <RoleGuard allowed={['PENTESTER']}>
              <HackerLayout />
            </RoleGuard>
          </OnboardingGuard>
        ),
        children: [
          {
            path: "hacker-dashboard",
            element: <DashboardPreview />,
          },
          {
            path: "hacker-profile",
            element: <HackerProfile />,
          },
          {
            path: "hacker-verification",
            element: <HackerVerification />,
          },
          {
            path: "national-id-verification",
            element: <EthiopiaIDVerification />,
          },
          {
            path: "projects",
            element: <Projects />,
          },
          {
            path: "projects/:projectId",
            element: <ProjectWorkspace />,
          },
          {
            path: "findings/:findingId",
            element: <FindingDetails />,
          },
          {
            path: "findings",
            element: <VulnerabilityFindings />,
          },
          {
            path: "engagements",
            element: <EngagementBoard />,
          },

          {
            path: "messages",
            element: <HackerChat />,
          },
          {
            path: "execute-agreement",
            element: <AgreementExecute />,
          },
          {
            path: "execute-agreement/:id",
            element: <AgreementExecute />,
          },
          {
            path: "hacker-reports",
            element: <Reports />,
          },
          {
            path: "ai-agent/:sessionId/logs",
            element: <AiAgentLogsPage />,
          },
        ],
      },

      // ══════════════════════════════════════════════════════════════
      // PROJECT_ADMIN routes  (blue sidebar layout)
      // ══════════════════════════════════════════════════════════════
      {
        element: (
          <OnboardingGuard>
            <RoleGuard allowed={['PROJECT_ADMIN']} customCheck={isOrgAdminMember}>
              <ProjectAdminLayout />
            </RoleGuard>
          </OnboardingGuard>
        ),
        children: [
          {
            path: "admin-dashboard",
            element: <SystemAdminDashboard />,
          },
          {
            path: "pa-projects",
            element: <Projects />,
          },
          {
            path: "pa-projects/:projectId",
            element: <ProjectWorkspace />,
          },
          {
            path: "pa-findings/:findingId",
            element: <FindingDetails />,
          },
          {
            path: "pa-findings",
            element: <VulnerabilityFindings />,
          },
          {
            path: "pa-messages",
            element: <HackerChat />,
          },
          {
            path: "pa-reports",
            element: <Reports />,
          },
          {
            path: "pa-profile",
            element: <HackerProfile />,
          },
          {
            path: "pa-agreement",
            element: <AgreementExecute />,
          },
          {
            path: "execute-agreement/:id",
            element: <AgreementExecute />,
          },
        ],
      },

      // ══════════════════════════════════════════════════════════════
      // ORG_ADMIN routes  (org sidebar layout)
      // ══════════════════════════════════════════════════════════════
      {
        element: (
          <OnboardingGuard>
            <RoleGuard allowed={['ORG_ADMIN']}>
              <OrganizationLayout />
            </RoleGuard>
          </OnboardingGuard>
        ),
        children: [
          {
            path: "dashboard",
            element: <OrganizationDashboard />,
          },
          {
            path: "org-projects",
            element: <OrganizationProjects />,
          },
          {
            path: "org-projects/:projectId",
            element: <OrganizationProjectWorkspace />,
          },
          {
            path: "discover",
            element: <OrganizationDiscover />,
          },
          {
            path: "discover/:hackerId",
            element: <HackerPublicProfile />,
          },
          {
            path: "reports",
            element: <Reports />,
          },
          {
            path: "organization-profile",
            element: <OrganizationProfile />,
          },
          {
            path: "org-findings",
            element: <VulnerabilityFindings />,
          },
          {
            path: "org-findings/:findingId",
            element: <FindingDetails />,
          },
          {
            path: "legal",
            element: <LegalAgreementList />,
          },
          {
            path: "legal/create",
            element: <LegalAgreementCreate />,
          },
          {
            path: "org-messages",
            element: <OrganizationChat />,
          },
          {
            path: "org-agreement",
            element: <AgreementExecute />,
          },
          {
            path: "execute-agreement/:id",
            element: <AgreementExecute />,
          },
        ],
      },

      // ══════════════════════════════════════════════════════════════
      // Shared / non-role-specific protected routes
      // ══════════════════════════════════════════════════════════════
      {
        path: "organization-verification/:organizationId",
        element: <OnboardingGuard><OrganizationVerification /></OnboardingGuard>,
      },
      {
        path: "onboarding",
        element: <OnboardingGuard><OnboardingLayout /></OnboardingGuard>,
        children: [
          {
            path: "hacker",
            element: <HackerOnboarding />,
          },
          {
            path: "organization",
            element: <OrgOnboarding />,
          }
        ]
      },
      {
        path: "admin/approvals",
        element: <OnboardingGuard><ApprovalsDashboard /></OnboardingGuard>,
      },
      {
        path: "admin/approvals/hacker/:id",
        element: <OnboardingGuard><OperatorReview /></OnboardingGuard>,
      },
      {
        path: "admin/approvals/org/:id",
        element: <OnboardingGuard><OrgReview /></OnboardingGuard>,
      },
      {
        path: "workflows/:workflowId",
        element: (
          <OnboardingGuard>
            <RoleGuard allowed={['PENTESTER', 'PROJECT_ADMIN', 'ORG_ADMIN']}>
              <WorkflowEditor />
            </RoleGuard>
          </OnboardingGuard>
        ),
      },
      {
        path: "org-workflows/:workflowId",
        element: (
          <OnboardingGuard>
            <RoleGuard allowed={['ORG_ADMIN']}>
              <WorkflowEditor isOrgView={true} />
            </RoleGuard>
          </OnboardingGuard>
        ),
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: "login",
            element: <Login />,
          },
          {
            path: "register",
            element: <Register />,
          },
          {
            path: "register/:role",
            element: <Register />,
          },
          {
            path: "verify-email",
            element: <VerifyEmail />,
          },
          {
            path: "forgot-password",
            element: <ForgotPassword />,
          },
          {
            path: "reset-password",
            element: <ResetPassword />,
          },
        ]
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ]
  },
]);

export default router;