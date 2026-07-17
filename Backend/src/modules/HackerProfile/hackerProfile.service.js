import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { HackerProfileErrorCodes, VerificationStatus } from './hackerProfile.constants.js';
import { calculateTrustScore } from '../user/user.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Coerce a value that may be a comma-separated string or array into a clean array.
 */
const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(s => String(s).trim()).filter(Boolean);
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
};

// ─── Service Functions ───────────────────────────────────────────────────────

export const getMyProfile = async (userId) => {
  const profile = await prisma.hackerProfile.findUnique({
    where: { userId },
  });
  return profile;
};

/**
 * Public profile — used by ORG_ADMIN to view a hacker's full approved profile.
 * Fetches by userId and includes user info + completed pentest projects.
 */
export const getPublicProfile = async (userIdOrProfileId) => {
  const profile = await prisma.hackerProfile.findFirst({
    where: {
      OR: [
        { userId: userIdOrProfileId },
        { id: userIdOrProfileId }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          handle: true,
          avatar: true,
          trustScore: true,
          nationalIDVerification: { select: { verificationStatus: true } },
          // Fetch completed pentests where user was lead or collaborator
          pentestsLed: {
            where: { status: { in: ['CLOSED', 'REPORTING', 'IN_PROGRESS'] } },
            select: {
              id: true, name: true, status: true, createdAt: true,
              organization: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          pentestCollaborators: {
            where: { pentest: { status: { in: ['CLOSED', 'REPORTING', 'IN_PROGRESS'] } } },
            select: {
              pentest: {
                select: {
                  id: true, name: true, status: true, createdAt: true,
                  organization: { select: { name: true } }
                }
              }
            },
            orderBy: { addedAt: 'desc' },
            take: 10,
          },
          reviewsReceived: {
            select: {
              id: true, rating: true, comment: true, createdAt: true,
              author: { select: { id: true, fullName: true, handle: true } },
              pentest: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  });

  if (!profile) return null;

  const ratingAggregate = await prisma.review.aggregate({
    where: { subjectId: profile.userId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  if (profile.user) {
    profile.user.averageRating = ratingAggregate._avg.rating || 0;
    profile.user.totalReviews = ratingAggregate._count.rating || 0;
  }

  return profile;
};

export const createHackerReview = async (authorId, subjectId, rating, comment, pentestId) => {
  if (authorId === subjectId) {
    throw new AppError('You cannot rate your own profile', 400);
  }
  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Rating must be an integer between 1 and 5', 400);
  }

  if (pentestId) {
    const pentest = await prisma.pentest.findUnique({
      where: { id: pentestId },
      include: {
        collaborators: true,
      }
    });
    if (!pentest) {
      throw new AppError('The specified project does not exist', 404);
    }
    const isLead = pentest.leadPentesterId === subjectId;
    const isCollab = pentest.collaborators.some(c => c.userId === subjectId);
    if (!isLead && !isCollab) {
      throw new AppError('The pentester is not assigned to this project', 400);
    }
  }

  const existingReview = await prisma.review.findFirst({
    where: {
      authorId,
      subjectId,
    },
  });

  const reviewData = {
    rating: ratingNum,
    comment: comment || null,
    pentestId: pentestId || null,
  };

  let review;
  if (existingReview) {
    review = await prisma.review.update({
      where: { id: existingReview.id },
      data: reviewData,
      include: {
        author: { select: { id: true, fullName: true, handle: true } },
        pentest: { select: { id: true, name: true } },
      },
    });
  } else {
    review = await prisma.review.create({
      data: {
        authorId,
        subjectId,
        ...reviewData,
      },
      include: {
        author: { select: { id: true, fullName: true, handle: true } },
        pentest: { select: { id: true, name: true } },
      }
    });
  }

  return review;
};

export const upsertMyProfile = async (userId, payload) => {
  const existing = await prisma.hackerProfile.findUnique({ where: { userId } });

  if (existing && [VerificationStatus.UNDER_REVIEW, VerificationStatus.APPROVED].includes(existing.status)) {
    throw new AppError(
      'Approved or under-review profiles cannot be edited. Contact an administrator.',
      403,
      HackerProfileErrorCodes.FORBIDDEN_UPDATE,
    );
  }

  if (payload.status === VerificationStatus.SUBMITTED) {
    if (!payload.bio || String(payload.bio).trim().length < 10) {
      throw new AppError('Bio is required and must be at least 10 characters to submit your profile.', 400);
    }
  }

  const nextStatus = payload.status === VerificationStatus.SUBMITTED
    ? VerificationStatus.SUBMITTED
    : (existing?.status || VerificationStatus.DRAFT);

  const data = {
    bio: payload.bio,
    country: payload.country || null,
    yearsOfExperience: payload.yearsOfExperience ? Number(payload.yearsOfExperience) : null,
    primarySkills: toArray(payload.primarySkills),
    certifications: toArray(payload.certifications),
    education: toArray(payload.education),
    employment: toArray(payload.employment),
    otherExperiences: toArray(payload.otherExperiences),
    portfolioLinks: toArray(payload.portfolioLinks),

    // Extended identity fields
    specialization: payload.specialization || null,
    githubUsername: payload.githubUsername || null,
    linkedinProfile: payload.linkedinProfile || null,
    twitter: payload.twitter || null,
    idDocumentNumber: payload.idDocumentNumber || null,

    status: nextStatus,
  };

  const profile = await prisma.hackerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  // Also update the User's full name and avatar if provided in the payload
  if (payload.fullName || payload.avatar) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.fullName && { fullName: payload.fullName }),
        ...(payload.avatar && { avatar: payload.avatar }),
      },
    });
  }

  await calculateTrustScore(userId);

  return profile;
};

/**
 * Submit the hacker profile for platform review.
 * NDA agreements are NO LONGER required at this stage —
 * they are only enforced when applying to an organization project.
 */
export const submitMyProfile = async (userId) => {
  const profile = await prisma.hackerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError('Hacker profile not found', 404, HackerProfileErrorCodes.NOT_FOUND);
  }

  if (profile.status === VerificationStatus.APPROVED) {
    return profile;
  }

  const updated = await prisma.hackerProfile.update({
    where: { userId },
    data: { status: VerificationStatus.SUBMITTED },
  });

  await calculateTrustScore(userId);

  return updated;
};

/**
 * Public discovery endpoint — returns paginated APPROVED hacker profiles.
 * Supports text search, skill filtering, and cert filtering.
 */
export const discoverHackers = async ({ page = 1, limit = 12, search, skills, certs }) => {
  const skip = (page - 1) * limit;

  // Build the `where` clause - show ALL profiles (removed APPROVED filter per user request)
  const where = {};

  // Skills filter: profile must have at least one of the selected skills
  if (skills && skills.length > 0) {
    where.primarySkills = { hasSome: skills };
  }

  // Certs filter: profile must have at least one of the selected certs
  if (certs && certs.length > 0) {
    where.certifications = { hasSome: certs };
  }

  // Text search across bio, specialization, country, and joined user fields
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { bio: { contains: q, mode: 'insensitive' } },
      { specialization: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { handle: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [profiles, total] = await Promise.all([
    prisma.hackerProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            handle: true,
            avatar: true,
            trustScore: true,
            reviewsReceived: {
              select: {
                rating: true,
              },
            },
            pentestsLed: {
              select: {
                status: true,
              },
            },
            pentestCollaborators: {
              select: {
                pentest: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.hackerProfile.count({ where }),
  ]);

  const enrichedProfiles = profiles.map(profile => {
    const u = profile.user || {};

    // Calculate averageRating and totalReviews
    const reviews = u.reviewsReceived || [];
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1))
      : 0;

    // Calculate totalProjects, completedProjects, successRate
    const ledProjects = u.pentestsLed || [];
    const collabProjects = (u.pentestCollaborators || []).map(c => c.pentest).filter(Boolean);
    const allProjects = [...ledProjects, ...collabProjects];
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.status === 'COMPLETED' || p.status === 'CLOSED').length;
    const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 100;

    // Determine category / rank based on averageRating, trustScore, and successRate
    const trustScore = u.trustScore ?? 100;

    let rank = 'BRONZE';
    if (trustScore >= 120 && successRate >= 80 && (totalReviews === 0 || averageRating >= 4.0)) {
      rank = 'GOLD';
    } else if (trustScore >= 100 && successRate >= 50) {
      rank = 'SILVER';
    }

    // Clean up internal relations to keep response payload slim
    const { reviewsReceived, pentestsLed, pentestCollaborators, ...userWithoutRelations } = u;

    return {
      ...profile,
      user: userWithoutRelations,
      rating: totalReviews > 0 ? averageRating : 0, // Show real rated value, default to 0
      totalReviews,
      successRate,
      rank,
    };
  });

  return {
    profiles: enrichedProfiles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listProfilesForReview = async (statusFilter) => {
  const where = statusFilter ? { status: statusFilter } : {};
  return prisma.hackerProfile.findMany({
    where,
    include: {
      user: {
        select: { id: true, email: true, fullName: true, handle: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Check which mandatory agreements the user has NOT yet signed.
 * Used only for informational display — no longer blocks profile submission.
 */
export const getMissingAgreements = async (userId) => {
  const mandatoryAgreements = ['Mutual Non-Disclosure Agreement (MNDA)', 'Ethical Hacking Code of Conduct'];

  const signedAgreements = await prisma.userSignature.findMany({
    where: { userId },
    include: { agreement: true },
  });

  const signedTitles = signedAgreements.map(s => s.agreement.title);
  return mandatoryAgreements.filter(title => !signedTitles.includes(title));
};

/**
 * Sign a specific agreement by title (used from the onboarding UI).
 */
export const signAgreement = async (userId, agreementTitle, meta = {}) => {
  const agreement = await prisma.legalAgreement.findFirst({
    where: { title: agreementTitle, isActive: true },
    orderBy: { version: 'desc' },
  });

  if (!agreement) {
    throw new AppError('Agreement not found or inactive', 404);
  }

  const signature = await prisma.userSignature.upsert({
    where: {
      userId_agreementId: { userId, agreementId: agreement.id },
    },
    create: {
      userId,
      agreementId: agreement.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
    update: {
      signedAt: new Date(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return signature;
};

export const reviewProfile = async (profileId, reviewerId, action, notes) => {
  const profile = await prisma.hackerProfile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new AppError('Hacker profile not found', 404, HackerProfileErrorCodes.NOT_FOUND);
  }

  const newStatus = action === 'approve'
    ? VerificationStatus.APPROVED
    : VerificationStatus.REJECTED;

  const updated = await prisma.hackerProfile.update({
    where: { id: profileId },
    data: {
      status: newStatus,
      reviewNotes: notes || null,
      reviewedById: reviewerId,
    },
  });

  await calculateTrustScore(profile.userId);
  return updated;
};
