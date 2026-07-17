// src/modules/organization/organization.constants.js

export const OrganizationRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const OrganizationPermissions = {
  CREATE_PENTESTS: 'create_pentests',
  INVITE_MEMBERS: 'invite_members',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_REPORTS: 'view_reports'
};

export const RolePermissions = {
  [OrganizationRole.OWNER]: [
    OrganizationPermissions.CREATE_PENTESTS,
    OrganizationPermissions.INVITE_MEMBERS,
    OrganizationPermissions.MANAGE_SETTINGS,
    OrganizationPermissions.VIEW_REPORTS
  ],
  [OrganizationRole.ADMIN]: [
    OrganizationPermissions.CREATE_PENTESTS,
    OrganizationPermissions.INVITE_MEMBERS,
    OrganizationPermissions.VIEW_REPORTS
  ],
  [OrganizationRole.MEMBER]: [
    OrganizationPermissions.CREATE_PENTESTS,
    OrganizationPermissions.VIEW_REPORTS
  ],
  [OrganizationRole.VIEWER]: [
    OrganizationPermissions.VIEW_REPORTS
  ]
};

export const VerificationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const OrganizationErrorCodes = {
  NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ALREADY_EXISTS: 'ORGANIZATION_ALREADY_EXISTS',
  SLUG_TAKEN: 'ORGANIZATION_SLUG_TAKEN',
  UNAUTHORIZED: 'UNAUTHORIZED_ACCESS',
  MEMBER_EXISTS: 'MEMBER_ALREADY_EXISTS',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  INVALID_ROLE: 'INVALID_ROLE'
};

export const PaginationDefaults = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  SORT_BY: 'createdAt',
  SORT_ORDER: 'desc'
};