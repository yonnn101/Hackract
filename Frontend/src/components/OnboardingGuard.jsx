import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";
import { hasRole, getDashboardPath, ROLES } from "../utils/roles.js";

const HACKER_READY_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW", "APPROVED"]);

const OnboardingGuard = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-[#00c477] font-mono animate-pulse tracking-widest uppercase">Validating Session...</div>
            </div>
        );
    }

    if (!user) {
        // Redirect completely unauthenticated users to login
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const isPentester = hasRole(user, ROLES.PENTESTER);
    const isProjectAdmin = hasRole(user, ROLES.PROJECT_ADMIN);
    const isOrgAdmin = hasRole(user, ROLES.ORG_ADMIN);

    let needsOnboarding = false;
    let targetOnboardingRoute = '/onboarding';

    if (isPentester || isProjectAdmin) {
        // Both PENTESTER and PROJECT_ADMIN need hacker profiles
        const profile = user.hackerProfile;
        const status = profile?.status;
        if (!profile || !HACKER_READY_STATUSES.has(status)) {
            needsOnboarding = true;
            targetOnboardingRoute = '/onboarding/hacker';
        }
    } else if (isOrgAdmin) {
        // Evaluate Organization status and ensure ORG_ADMIN finishes onboarding
        const orgs = user.organizations || [];
        const hasDraftOrg = orgs.some((membership) =>
            membership.organization && membership.organization.verificationStatus === 'DRAFT'
        );
        if (orgs.length === 0 || hasDraftOrg) {
            needsOnboarding = true;
            targetOnboardingRoute = '/onboarding/organization';
        }
    }

    // Is the user already trying to access an onboarding route or the profile page?
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    const isProfileRoute = location.pathname === '/hacker-profile';
    const isVerificationRoute = location.pathname === '/national-id-verification';

    if (isOnboardingRoute || isProfileRoute || isVerificationRoute) {
        // If they don't need onboarding anymore and they are on an onboarding route, push them to the role-based dashboard
        if (!needsOnboarding && isOnboardingRoute) {
            const destination = getDashboardPath(user);
            return <Navigate to={destination} replace />;
        }
        // Otherwise let them render the page
        return <>{children}</>;
    }

    // If they need onboarding but are trying to access a protected route (like /dashboard)
    if (needsOnboarding) {
        return <Navigate to={targetOnboardingRoute} replace />;
    }

    // All clear, render the protected component
    return <>{children}</>;
};

export default OnboardingGuard;
