// src/modules/organization/organization.middleware.js
import organizationRepository from './Organization.repository.js';
import AppError from '../../utils/AppError.js';
import prisma from '../../database/prismaClient.js';


const hasElevatedOrgAccess = (user) => {
  const roles = user?.roles?.map((r) => r.type) || [];
  return roles.includes('ORG_ADMIN');
};


export const isOrganizationMember = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    if (!organizationId) {
      return next(new AppError('Organization ID is required', 400));
    }

    if (hasElevatedOrgAccess(req.user)) {
      return next();
    }

    const isMember = await organizationRepository.isMember(organizationId, req.user.id);
    
    if (!isMember) {
      return next(new AppError('You are not a member of this organization', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const hasOrganizationPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId;
      
      if (!organizationId) {
        return next(new AppError('Organization ID is required', 400));
      }

      if (hasElevatedOrgAccess(req.user)) {
        return next();
      }

      const hasPermission = await organizationRepository.checkPermission(
        organizationId,
        req.user.id,
        permission
      );

      if (!hasPermission) {
        return next(new AppError('You do not have permission to perform this action', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const isOrganizationAdmin = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    if (!organizationId) {
      return next(new AppError('Organization ID is required', 400));
    }

    if (hasElevatedOrgAccess(req.user)) {
      return next();
    }

    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: req.user.id,
        OR: [
          { role: 'owner' },
          { role: 'admin' }
        ]
      }
    });

    if (!member) {
      return next(new AppError('You must be an admin or owner to perform this action', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const isOrganizationOwner = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    if (!organizationId) {
      return next(new AppError('Organization ID is required', 400));
    }

    if (hasElevatedOrgAccess(req.user)) {
      return next();
    }

    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: req.user.id,
        role: 'owner'
      }
    });

    if (!member) {
      return next(new AppError('You must be an owner to perform this action', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const loadOrganization = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId;
    
    if (!organizationId) {
      return next(new AppError('Organization ID is required', 400));
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
};

export const ensureOrganizationVerified = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    
    if (!organizationId) {
      return next();
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return next(new AppError('Organization not found', 404));
    }

    if (organization.verificationStatus !== 'APPROVED') {
      return next(new AppError('Access denied. Organization must be APPROVED to perform this action.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};