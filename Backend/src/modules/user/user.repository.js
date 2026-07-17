import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { UserErrorCodes } from './user.constants.js';

class UserRepository {
  async createUser(data) {
    try {
      return await prisma.user.create({
        data,
        include: {
          roles: true,
          organizations: true
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0];
        if (target === 'email') {
          throw new AppError('Email already exists', 409, UserErrorCodes.EMAIL_ALREADY_EXISTS);
        }
        if (target === 'handle') {
          throw new AppError('Handle already exists', 409, UserErrorCodes.HANDLE_ALREADY_EXISTS);
        }
      }
      throw error;
    }
  }

  async findById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
        organizations: {
          include: {
            organization: true
          }
        },
        userSignatures: true,
        hackerProfile: {
          select: {
            id: true,
            bio: true,
            country: true,
            yearsOfExperience: true,
            primarySkills: true,
            certifications: true,
            portfolioLinks: true,
            idDocumentNumber: true,
            githubUsername: true,
            linkedinProfile: true,
            twitter: true,
            status: true,
            reviewNotes: true,
            reviewedById: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        findingsReported: true
      }
    });

    // We don't throw NOT_FOUND here to allow flexible usage, 
    // service layer should handle if user is required.
    return user;
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: true }
    });
  }

  async findByHandle(handle) {
    return prisma.user.findUnique({
      where: { handle },
      include: { roles: true }
    });
  }

  async updateUser(id, data) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          roles: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('User not found', 404, UserErrorCodes.NOT_FOUND);
      }
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0];
        if (target === 'email') throw new AppError('Email already in use', 409, UserErrorCodes.EMAIL_ALREADY_EXISTS);
        if (target === 'handle') throw new AppError('Handle already in use', 409, UserErrorCodes.HANDLE_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('User not found', 404, UserErrorCodes.NOT_FOUND);
      }
      throw error;
    }
  }

  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { handle: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          fullName: true,
          handle: true,
          status: true,
          isVerified: true,
          trustScore: true,
          createdAt: true,
          lastLoginAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
}

export default new UserRepository();
