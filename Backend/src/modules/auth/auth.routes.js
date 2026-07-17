import express from 'express';
import * as controller from './auth.controller.js';
import { protect, validateLocal } from '../../middleware/Auth.middleware.js';
import {
	validate,
	registerSchema,
	loginSchema,
	refreshTokenSchema,
	verifyEmailSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
} from './auth.schema.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and profile APIs (Auth0)
 */

/**
 * @swagger
 * /api/v1/auth/local/register:
 *   post:
 *     summary: Register with email/password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 */
router.post('/local/register', validate(registerSchema), controller.registerLocal);

/**
 * @swagger
 * /api/v1/auth/local/login:
 *   post:
 *     summary: Login with email/password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/local/login', validate(loginSchema), controller.loginLocal);

/**
 * @swagger
 * /api/v1/auth/local/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post('/local/refresh', validate(refreshTokenSchema), controller.refreshToken);

router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', controller.resendVerification);
/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Send password reset link
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 */

router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', protect, controller.getMe);

// Local JWT-protected profile
router.get('/local/me', validateLocal, controller.getMe);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout (local session)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', controller.logout);

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Logout from all devices (clear local tokens)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 */
router.post('/logout-all', protect, controller.logoutAll);

// Admin lookup by email (supports both token types)
router.get('/user-by-email', protect, controller.findUserByEmail);

export default router;
