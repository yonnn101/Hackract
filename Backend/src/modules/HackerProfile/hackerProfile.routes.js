import express from 'express';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';
import { validate } from '../auth/auth.schema.js';
import { upsertHackerProfileSchema } from './hackerProfile.schema.js';
import * as controller from './hackerProfile.controller.js';

const router = express.Router();

// All hacker profile routes require authentication
router.use(protect);

// Hacker self-service routes (PENTESTER role)
router.get('/me', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.getMe);
router.get('/me/status', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.getStatus);
router.put('/me', restrictTo('PENTESTER', 'PROJECT_ADMIN'), validate(upsertHackerProfileSchema), controller.upsertMe);
router.post('/me/submit', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.submitMe);
router.post('/me/sign-agreement', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.signAgreement);

// Discovery route — MUST come before /:id to avoid route conflicts
router.get('/discover', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), controller.discoverHackers);

// Public profile by userId — ORG_ADMIN, PROJECT_ADMIN, or PENTESTER can view any approved hacker profile
router.get('/public/:userId', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), controller.getPublicHackerProfile);
router.post('/public/:userId/reviews', restrictTo('ORG_ADMIN'), controller.createReview);

// Admin review routes
router.get('/', restrictTo('ORG_ADMIN'), controller.listForReview);
router.post('/:id/approve', restrictTo('ORG_ADMIN'), controller.approve);
router.post('/:id/reject', restrictTo('ORG_ADMIN'), controller.reject);

export default router;

