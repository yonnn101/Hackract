import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import { hasAnyRole, getDashboardPath } from '../utils/roles.js';

/**
 * Route-level guard that restricts access to one or more roles.
 *
 * Usage:
 *   <RoleGuard allowed={['ORG_ADMIN']}>
 *     <OrganizationLayout />
 *   </RoleGuard>
 *
 * If the user is unauthenticated → redirect to /login
 * If the user lacks the required role → redirect to their own dashboard
 */
const RoleGuard = ({ allowed = [], customCheck, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still hydrating — show a minimal loader
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00c477] font-mono animate-pulse tracking-widest uppercase">
          Validating Access…
        </div>
      </div>
    );
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check custom validation if provided
  if (customCheck && customCheck(user)) {
    return <>{children}</>;
  }

  // Check role match
  if (allowed.length > 0 && !hasAnyRole(user, ...allowed)) {
    // Redirect to the user's own dashboard so they don't get a 403 page
    const fallback = getDashboardPath(user);
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
