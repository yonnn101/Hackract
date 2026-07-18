import asyncHandler from 'express-async-handler';
import authService from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import AppError from '../../utils/AppError.js';
import { AuthErrorCodes } from './auth.constants.js';

const metaFromReq = (req) => ({ userAgent: req.get('user-agent'), ipAddress: req.ip });

const isProduction = process.env.NODE_ENV === 'production';

const setAuthCookies = (res, tokens) => {
    if (!tokens) return;
    res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/'
    });
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/'
    });
};

export const registerLocal = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.registerLocal(payload, metaFromReq(req));
    if (result.tokens) {
        setAuthCookies(res, result.tokens);
    }
    ApiResponse.created(res, result, 'Registration successful');
});

export const loginLocal = asyncHandler(async (req, res) => {
    const payload = req.validatedBody || req.body;
    const result = await authService.loginLocal(payload, metaFromReq(req));
    if (result.tokens) {
        setAuthCookies(res, result.tokens);
    }
    ApiResponse.success(res, result, 'Login successful');
});

export const assignInitialRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    const result = await authService.assignInitialRole(req.user.id, role);
    ApiResponse.success(res, { user: result }, 'Identity selection synchronized successfully');
});

export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.validatedBody?.refreshToken || req.body?.refreshToken;
    if (!token) {
        throw new AppError('Refresh token is required', 400, AuthErrorCodes.REFRESH_TOKEN_INVALID);
    }
    const result = await authService.refresh(token, metaFromReq(req));
    if (result.tokens) {
        setAuthCookies(res, result.tokens);
    }
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
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(token, req.user?.id);
    clearAuthCookies(res);
    ApiResponse.success(res, null, 'Logged out from local session');
});

/**
 * Logout from all devices (clear local session tokens)
 */
export const logoutAll = asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.user.id);
    clearAuthCookies(res);
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
