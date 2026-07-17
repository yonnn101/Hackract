// src/modules/organization/organization.service.js
import organizationRepository from './Organization.repository.js';
import { OrganizationErrorCodes, VerificationStatus } from './Organization.constants.js';
import AppError from '../../utils/AppError.js';
import prisma from '../../database/prismaClient.js';

const isOrgAdmin = (user) => {
  const roles = user?.roles?.map((r) => r.type) || [];
  return roles.includes('ORG_ADMIN');
};

const toPagination = ({ page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
};

class OrganizationService {
  async createOrganization(data, userId) {
    const userOrganizations = await this.getUserOrganizations(userId);
    if (userOrganizations.length >= 10) {
      throw new AppError('You have reached the maximum number of organizations', 400, 'MAX_ORGANIZATIONS_REACHED');
    }

    return await organizationRepository.createOrganization(data, userId);
  }

  async getOrganizationById(id, user) {
    const organization = await organizationRepository.getOrganizationById(id, true);

    if (isOrgAdmin(user)) {
      return organization;
    }

    const isMember = await organizationRepository.isMember(id, user.id);
    if (!isMember) {
      throw new AppError('Unauthorized access to organization', 403, OrganizationErrorCodes.UNAUTHORIZED);
    }

    return organization;
  }

  async updateOrganization(id, data, user) {
    if (isOrgAdmin(user)) {
      return organizationRepository.updateOrganization(id, data);
    }

    const hasPermission = await organizationRepository.checkPermission(id, user.id, 'manage_settings');
    if (!hasPermission) {
      throw new AppError('Unauthorized to update organization', 403, OrganizationErrorCodes.UNAUTHORIZED);
    }


    return organizationRepository.updateOrganization(id, data);
  }



  async submitVerification(id, data, userId) {
    const organization = await organizationRepository.getOrganizationById(id);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    if (organization.verificationStatus === VerificationStatus.APPROVED) {
      return organization;
    }

    // Map frontend-friendly `address` to the DB field `addressLine1` to satisfy Prisma schema
    const updateData = { ...data };
    if (updateData.address) {
      updateData.addressLine1 = updateData.address;
      delete updateData.address;
    }

    return await organizationRepository.updateOrganization(id, {
      ...updateData,
      verificationStatus: VerificationStatus.SUBMITTED
    });
  }

  async approveOrganization(id, adminId) {
    const organization = await organizationRepository.getOrganizationById(id);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    return await organizationRepository.updateOrganization(id, {
      verificationStatus: VerificationStatus.APPROVED
    });
  }

  async rejectOrganization(id, adminId) {
    const organization = await organizationRepository.getOrganizationById(id);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    return await organizationRepository.updateOrganization(id, {
      verificationStatus: VerificationStatus.REJECTED
    });
  }

  async deleteOrganization(id, user) {
    if (isOrgAdmin(user)) {
      return organizationRepository.deleteOrganization(id);
    }

    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: user.id,
        role: 'owner',
      },
    });

    if (!member) {
      throw new AppError('Only organization owners can delete the organization', 403, OrganizationErrorCodes.UNAUTHORIZED);
    }

    return organizationRepository.deleteOrganization(id);
  }

  async listOrganizations(query, user) {
    const { skip, take, page, limit } = toPagination(query);
    const name = query?.name;
    const ownerName = query?.ownerName;

    const organizations = isOrgAdmin(user)
      ? await organizationRepository.listOrganizations({ name, ownerName, skip, take })
      : await organizationRepository.listOrganizationsForUser(user.id, { name, skip, take });

    return { organizations, page, limit };
  }

  async getOrganizationsByName(name, user, query = {}) {
    return this.listOrganizations({ ...query, name }, user);
  }

  async getOrganizationsByOwnerName(ownerName, user, query = {}) {
    if (!isOrgAdmin(user)) {
      throw new AppError('Only system admins can search organizations by owner', 403, OrganizationErrorCodes.UNAUTHORIZED);
    }
    return this.listOrganizations({ ...query, ownerName }, user);
  }

  async deleteAllOrganizations(user) {
    if (!isOrgAdmin(user)) {
      throw new AppError('Only system admins can delete all organizations', 403, OrganizationErrorCodes.UNAUTHORIZED);
    }

    const orgs = await prisma.organization.findMany({ select: { id: true } });
    let deletedCount = 0;
    for (const org of orgs) {
      await organizationRepository.deleteOrganization(org.id);
      deletedCount += 1;
    }

    return { deletedCount };
  }



  async getMembers(organizationId) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            handle: true,
            status: true,
          },
        },
      },
    });
  }

  async addMember(organizationId, data, adminId) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new AppError('User with this email not found', 404);
    }

    const existingMember = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: user.id }
    });

    if (existingMember) {
      throw new AppError('User is already a member of this organization', 400);
    }

    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: data.role || 'member',
        canCreatePentests: data.canCreatePentests || false,
        canInviteMembers: data.canInviteMembers || false
      }
    });
  }

  async updateMember(organizationId, userId, data, adminId) {
    try {
      return await prisma.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId,
            userId
          }
        },
        data
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Member not found', 404);
      }
      throw error;
    }
  }

  async removeMember(organizationId, userId, adminId) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    if (member.role === 'owner') {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId, role: 'owner' }
      });
      if (ownerCount <= 1) {
        throw new AppError('Cannot remove the last owner of the organization', 400);
      }
    }

    return prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });
  }

  async validateDomain(organizationId, userId) {
    const org = await organizationRepository.getOrganizationById(organizationId);
    if (!org.website) {
      throw new AppError('Organization website is required for domain validation', 400);
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const emailDomain = user.email.split('@')[1].toLowerCase();
    const websiteDomain = org.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();

    const isMatch = emailDomain === websiteDomain;

    if (isMatch) {
      await organizationRepository.updateOrganization(organizationId, {
        verificationStatus: VerificationStatus.APPROVED
      });
    }

    return {
      valid: isMatch,
      emailDomain,
      websiteDomain,
      message: isMatch ? 'Domain validated successfully' : 'Domain mismatch'
    };
  }

  async getUserOrganizations(userId) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });

    return memberships.map(membership => membership.organization);
  }
}

export default new OrganizationService();