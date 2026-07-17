import asyncHandler from 'express-async-handler';
import authService from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import AppError from '../../utils/AppError.js';
import { AuthErrorCodes } from './auth.constants.js';

const metaFromReq = (req) => ({ userAgent: req.get('user-agent'), ipAddress: req.ip });

export const registerLocal = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.registerLocal(payload, metaFromReq(req));
    ApiResponse.created(res, result, 'Registration successful');
});

export const loginLocal = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.loginLocal(payload, metaFromReq(req));
    ApiResponse.success(res, result, 'Login successful');
});

export const assignInitialRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    const result = await authService.assignInitialRole(req.user.id, role);
    ApiResponse.success(res, { user: result }, 'Identity selection synchronized successfully');
});

export const refreshToken = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.refresh(payload.refreshToken, metaFromReq(req));
    ApiResponse.success(res, result, 'Token refreshed successfully');
});

/**
 * Get currently authenticated user profile
 */
export const getMe = asyncHandler(async (req, res) => {
    // req.user is already populated by the protect middleware
    const user = await authService.getUserProfile(req.user.id);

    if (!user) {
        throw new AppError('User profile not found', 404, AuthErrorCodes.USER_NOT_FOUND);
    }

    ApiResponse.success(res, { user }, 'User profile retrieved successfully');
});

/**
 * Logout from local device
 */
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    await authService.logout(refreshToken, req.user?.id);
    ApiResponse.success(res, null, 'Logged out from local session');
});

/**
 * Logout from all devices (clear local session tokens)
 */
export const logoutAll = asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.user.id);
    ApiResponse.success(res, null, result.message);
});

export const findUserByEmail = asyncHandler(async (req, res) => {
    const email = req.query.email;
    if (!email) {
        throw new AppError('Email query parameter is required', 400, 'EMAIL_REQUIRED');
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
        throw new AppError('User not found', 404, AuthErrorCodes.USER_NOT_FOUND, { email });
    }

    ApiResponse.success(res, { user }, 'User retrieved successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.verifyEmail(payload.token, payload.email);
    ApiResponse.success(res, result, result.message || 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    if (!payload.email) {
        throw new AppError('Email is required', 400);
    }
    const result = await authService.resendVerification(payload.email, metaFromReq(req));
    ApiResponse.success(res, result, result.message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.forgotPassword(payload.email, metaFromReq(req));
    ApiResponse.success(res, result, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.resetPassword(payload.token, payload.newPassword);
    ApiResponse.success(res, result, result.message);
});

export const validateOrgEmail = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = authService.validateOrganizationEmail(payload.email);
    ApiResponse.success(res, result, result.isValid ? 'Organization email looks valid' : 'Organization email is not allowed');
});
