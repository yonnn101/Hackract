/**
 * Centralized role constants and utility helpers.
 * Import from here so every component uses the same values.
 */

// ── Role type strings (must match the Prisma RoleType enum) ──────────
export const ROLES = Object.freeze({
  ORG_ADMIN: 'ORG_ADMIN',
  PROJECT_ADMIN: 'PROJECT_ADMIN',
  PENTESTER: 'PENTESTER',
});

// ── Default dashboard path for each role ─────────────────────────────
export const DASHBOARD_BY_ROLE = Object.freeze({
  [ROLES.ORG_ADMIN]: '/dashboard',
  [ROLES.PROJECT_ADMIN]: '/admin-dashboard',
  [ROLES.PENTESTER]: '/hacker-dashboard',
});

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the role type strings from the user's `roles` array.
 * Handles both `{ type }` objects and plain strings.
 */
export const getRoleTypes = (user) => {
  if (!user?.roles) return [];
  return user.roles.map((r) => (typeof r === 'string' ? r : r.type));
};

/**
 * Check whether a user has **at least one** of the given roles.
 */
export const hasAnyRole = (user, ...roles) => {
  const userRoles = getRoleTypes(user);
  return roles.some((r) => userRoles.includes(r));
};

/**
 * Check whether a user has a **specific** role.
 */
export const hasRole = (user, role) => hasAnyRole(user, role);

/**
 * Return the "primary" role — the first role in the array, or null.
 */
export const getPrimaryRole = (user) => {
  const types = getRoleTypes(user);
  return types[0] || null;
};

/**
 * Return the dashboard path for the user's primary role.
 */
export const getDashboardPath = (user) => {
  const primary = getPrimaryRole(user);
  return DASHBOARD_BY_ROLE[primary] || '/';
};

/**
 * Check whether a user is assigned as an admin or owner in any organization.
 */
export const isOrgAdminMember = (user) => {
  if (!user?.organizations || !Array.isArray(user.organizations)) return false;
  return user.organizations.some(org => org.role === 'admin' || org.role === 'owner');
};
