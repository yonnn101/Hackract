// src/modules/organization/organization.repository.js
import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { OrganizationErrorCodes } from './Organization.constants.js';

class OrganizationRepository {
  buildOrganizationInclude(includeMembers = false) {
    const include = {
      _count: {
        select: {
          members: true,
          pentests: true,
        },
      },
    };

    if (includeMembers) {
      include.members = {
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
      };
    }

    return include;
  }

  async createOrganization(data, createdById) {
    try {
      return await prisma.$transaction(async (tx) => {
        let slug = data.slug;
        if (!slug) {
          slug = await this.generateSlug(data.name, tx);
        }

        const existing = await tx.organization.findUnique({
          where: { slug }
        });

        if (existing) {
          throw new AppError('Organization slug already taken', 400, OrganizationErrorCodes.SLUG_TAKEN);
        }

        const organization = await tx.organization.create({
          data: {
            name: data.name,
            slug: slug,
            description: data.description,
            industry: data.industry,
            size: data.size,
            website: data.website,
            primaryEmail: data.primaryEmail,
            phoneNumber: data.phoneNumber,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country,
            timezone: data.timezone,
            currency: data.currency,
            registrationNumber: data.registrationNumber,
            taxId: data.taxId
          }
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: createdById,
            role: 'owner',
            canCreatePentests: true,
            canInviteMembers: true
          }
        });

        return organization;
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AppError('Organization slug already exists', 400, OrganizationErrorCodes.SLUG_TAKEN);
      }
      throw error;
    }
  }

  async generateSlug(name, tx) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await tx.organization.findUnique({
        where: { slug }
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async getOrganizationById(id, includeMembers = false) {
    const include = this.buildOrganizationInclude(includeMembers);

    const organization = await prisma.organization.findUnique({
      where: { id },
      include
    });

    if (!organization) {
      throw new AppError('Organization not found', 404, OrganizationErrorCodes.NOT_FOUND);
    }

    return organization;
  }

  async listOrganizations({ name, ownerName, skip = 0, take = 20, includeMembers = false } = {}) {
    const where = {};

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (ownerName) {
      where.members = {
        some: {
          role: 'owner',
          user: {
            OR: [
              { fullName: { contains: ownerName, mode: 'insensitive' } },
              { handle: { contains: ownerName, mode: 'insensitive' } },
              { email: { contains: ownerName, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    return prisma.organization.findMany({
      where,
      include: this.buildOrganizationInclude(includeMembers),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async listOrganizationsForUser(userId, { name, skip = 0, take = 20, includeMembers = false } = {}) {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        ...(name
          ? {
              organization: {
                name: { contains: name, mode: 'insensitive' },
              },
            }
          : {}),
      },
      include: {
        organization: {
          include: this.buildOrganizationInclude(includeMembers),
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip,
      take,
    });

    return memberships.map((m) => m.organization);
  }

  async getOrganizationBySlug(slug) {
    const organization = await prisma.organization.findUnique({
      where: { slug }
    });

    if (!organization) {
      throw new AppError('Organization not found', 404, OrganizationErrorCodes.NOT_FOUND);
    }

    return organization;
  }

  async updateOrganization(id, data) {
    try {
      return await prisma.organization.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Organization not found', 404, OrganizationErrorCodes.NOT_FOUND);
      }
      if (error.code === 'P2002') {
        throw new AppError('Organization slug already exists', 400, OrganizationErrorCodes.SLUG_TAKEN);
      }
      throw error;
    }
  }

  async deleteOrganization(id) {
    try {
      return await prisma.$transaction(async (tx) => {
        const pentests = await tx.pentest.findMany({
          where: { organizationId: id },
          select: { id: true }
        });

        const pentestIds = pentests.map((p) => p.id);

        if (pentestIds.length) {
          await tx.pentestCollaborator.deleteMany({ where: { pentestId: { in: pentestIds } } });
          await tx.finding.deleteMany({ where: { pentestId: { in: pentestIds } } });
          await tx.aiAgent.deleteMany({ where: { pentestId: { in: pentestIds } } });
          await tx.pentest.deleteMany({ where: { id: { in: pentestIds } } });
        }

        await tx.auditLog.deleteMany({ where: { organizationId: id } });
        await tx.organizationMember.deleteMany({ where: { organizationId: id } });

        return tx.organization.delete({ where: { id } });
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('Organization not found', 404, OrganizationErrorCodes.NOT_FOUND);
      }
      if (error.code === 'P2003') {
        throw new AppError(
          'Organization cannot be deleted while related resources exist (e.g., pentests, audit logs). Remove or migrate them first.',
          409
        );
      }
      throw error;
    }
  }

  async isMember(organizationId, userId) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId
      }
    });

    return !!member;
  }

  async checkPermission(organizationId, userId, permission) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId
      }
    });

    if (!member) return false;

    if (permission === 'create_pentests') {
      return member.canCreatePentests;
    }
    if (permission === 'invite_members') {
      return member.canInviteMembers;
    }

    return true;
  }


}

export default new OrganizationRepository();