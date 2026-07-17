import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import memberRepository from './member.repository.js';
import organizationRepository from '../Organization/Organization.repository.js';

const hasRole = (user, role) => (user?.roles || []).some((r) => r.type === role);

const ensureOrgAdminAccess = async (organizationId, user) => {
    if (!hasRole(user, 'ORG_ADMIN')) {
        throw new AppError('Only organization admins can manage members', 403);
    }
    // We assume any global ORG_ADMIN is an owner/admin of the organization they are managing.
};

const ensureOrganizationExists = async (organizationId) => {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
        throw new AppError('Organization not found', 404);
    }
    return organization;
};

export const addMember = async (data, user) => {
    await ensureOrganizationExists(data.organizationId);
    await ensureOrgAdminAccess(data.organizationId, user);
    return memberRepository.addMember(data);
};

export const listMembers = async (organizationId, user) => {
    await ensureOrganizationExists(organizationId);
    await ensureOrgAdminAccess(organizationId, user);
    return memberRepository.listMembers(organizationId);
};

export const getMember = async (organizationId, userId, user) => {
    await ensureOrganizationExists(organizationId);
    await ensureOrgAdminAccess(organizationId, user);
    return memberRepository.findMember(organizationId, userId);
};

export const removeMember = async (organizationId, userId, user) => {
    await ensureOrganizationExists(organizationId);
    await ensureOrgAdminAccess(organizationId, user);
    return memberRepository.removeMember(organizationId, userId);
};

export const updateMember = async (organizationId, userId, data, user) => {
    await ensureOrganizationExists(organizationId);
    await ensureOrgAdminAccess(organizationId, user);
    return memberRepository.updateMember(organizationId, userId, data);
};
