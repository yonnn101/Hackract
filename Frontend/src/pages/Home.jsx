import React from "react";
import { useAuth } from "../context/authContext";
import HackerDashboard from "./HackerDashboardView";
import OrganizationDashboard from "./OrganizationDashboard";

/**
 * Home component acts as a high-level router for the authenticated dashboard.
 * It detects the user's primary role and renders the appropriate specialized dashboard.
 */
const Home = () => {
  const { user, loading } = useAuth();

  // Show a premium loading state while bootstrapping session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-full border-2 border-[#00c477]/10 border-t-[#00c477] animate-spin shadow-[0_0_20px_rgba(0,255,136,0.2)]" />
          <p className="text-[10px] font-mono font-black text-[#00c477] uppercase tracking-[0.4em] animate-pulse">
            Synchronizing Neural Link...
          </p>
        </div>
      </div>
    );
  }

  // Determine dashboard based on primary role type
  const primaryRole = user?.roles?.[0]?.type;

  if (primaryRole === "ORG_ADMIN") {
    return <OrganizationDashboard />;
  }

  // Fallback to HackerDashboard for PENTESTER, PROJECT_ADMIN, or default
  return <HackerDashboard />;
};

export default Home;
