import bcrypt from 'bcrypt';
import userRepository from './user.repository.js';
import AppError from '../../utils/AppError.js';
import { UserErrorCodes } from './user.constants.js';

const SALT_ROUNDS = 12;

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, UserErrorCodes.NOT_FOUND);
  }
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Get all users with filters
 */
export const getAllUsers = async (filters) => {
  return await userRepository.findAll(filters);
};

/**
 * Update user profile
 */
export const updateProfile = async (userId, data) => {
  // Remove fields that shouldn't be updated via this endpoint
  const { passwordHash, status, isVerified, roles, provider, providerId, ...allowedData } = data;

  const user = await userRepository.updateUser(userId, allowedData);
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Change password
 */
export const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, UserErrorCodes.NOT_FOUND);
  }

  if (!user.passwordHash) {
    throw new AppError(
      'Cannot change password for OAuth accounts',
      400,
      UserErrorCodes.OAUTH_ACCOUNT,
      { provider: user.provider }
    );
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(
      'Current password is incorrect',
      400,
      UserErrorCodes.OLD_PASSWORD_INCORRECT
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepository.updateUser(userId, { passwordHash: hashedPassword });

  return { message: 'Password updated successfully' };
};

/**
 * Update account status (Admin only)
 */
export const updateAccountStatus = async (userId, status) => {
  const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED'];
  if (!validStatuses.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400,
      UserErrorCodes.INVALID_STATUS
    );
  }

  const user = await userRepository.updateUser(userId, { status });
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Deactivate account (soft delete)
 */
export const deactivateAccount = async (userId) => {
  await userRepository.updateUser(userId, { status: 'SUSPENDED' });
  return { message: 'Account deactivated successfully' };
};

/**
 * Delete account permanently
 */
export const deleteAccount = async (userId) => {
  await userRepository.deleteUser(userId);
  return { message: 'Account deleted permanently' };
};

/**
 * Calculate user trust score (Reputation)
 */
export const calculateTrustScore = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, UserErrorCodes.NOT_FOUND);
  }

  let score = 100; // Base reputation score

  // 1. Experience & Certifications (from HackerProfile)
  if (user.hackerProfile) {
    score += (user.hackerProfile.yearsOfExperience || 0) * 10;
    score += (user.hackerProfile.certifications?.length || 0) * 20;
    
    // Bonus for approved verification
    if (user.hackerProfile.status === 'APPROVED') {
      score += 50;
    }
  }

  // 2. Finding Quality (from findingsReported)
  if (user.findingsReported) {
    user.findingsReported.forEach((finding) => {
      // Only count verified or accepted findings
      if (['VERIFIED', 'FIXED', 'ACCEPTED_RISK'].includes(finding.status)) {
        switch (finding.severity) {
          case 'CRITICAL': score += 50; break;
          case 'HIGH': score += 25; break;
          case 'MEDIUM': score += 10; break;
          case 'LOW': score += 5; break;
          default: break;
        }
      }
    });
  }

  // 3. Legal Participation (Trust established by signing)
  if (user.userSignatures) {
    score += (user.userSignatures.length) * 15;
  }

  // Cap the score or ensure it doesn't go below 0
  const finalScore = Math.max(0, score);

  await userRepository.updateUser(userId, { trustScore: finalScore });

  return finalScore;
};
