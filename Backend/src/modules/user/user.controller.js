import asyncHandler from 'express-async-handler';
import * as service from './user.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

/**
 * Get current user profile
 */
export const me = asyncHandler(async (req, res) => {
  const { passwordHash, ...userWithoutPassword } = req.user;
  ApiResponse.success(res, { user: userWithoutPassword }, 'User profile retrieved successfully');
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await service.updateProfile(req.user.id, req.body);
  ApiResponse.success(res, { user }, 'Profile updated successfully');
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const result = await service.changePassword(req.user.id, req.body);
  ApiResponse.success(res, null, result.message);
});

/**
 * Deactivate account
 */
export const deactivate = asyncHandler(async (req, res) => {
  const result = await service.deactivateAccount(req.user.id);
  ApiResponse.success(res, null, result.message);
});

/**
 * Delete account permanently
 */
export const remove = asyncHandler(async (req, res) => {
  await service.deleteAccount(req.user.id);
  ApiResponse.noContent(res);
});

/**
 * Get all users (Admin only)
 */
export const listUsers = asyncHandler(async (req, res) => {
  const result = await service.getAllUsers(req.query);

  if (result.pagination) {
    ApiResponse.paginated(res, result.data, result.pagination, 'Users retrieved successfully');
  } else {
    ApiResponse.success(res, result, 'Users retrieved successfully');
  }
});

/**
 * Get user by ID (Admin only)
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  ApiResponse.success(res, { user }, 'User retrieved successfully');
});

/**
 * Update account status (Admin only)
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const user = await service.updateAccountStatus(req.params.id, status);
  ApiResponse.success(res, { user }, 'Account status updated successfully');
});

/**
 * Get current user trust score
 */
export const getMyTrustScore = asyncHandler(async (req, res) => {
  const score = await service.calculateTrustScore(req.user.id);
  ApiResponse.success(res, { trustScore: score }, 'Trust score calculated successfully');
});
