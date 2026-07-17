import express from 'express';
import * as controller from './userSignature.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UserSignatures
 *   description: User signature and agreement signing APIs
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/user-signatures/sign:
 *   post:
 *     summary: Sign a legal agreement
 *     tags: [UserSignatures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agreementId
 *             properties:
 *               agreementId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agreement signed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/sign', controller.sign);

/**
 * @swagger
 * /api/v1/user-signatures/my-signatures:
 *   get:
 *     summary: Get current user's signatures
 *     tags: [UserSignatures]
 *     responses:
 *       200:
 *         description: List of user signatures
 *       401:
 *         description: Unauthorized
 */
router.get('/my-signatures', controller.getMySignatures);

/**
 * @swagger
 * /api/v1/user-signatures/check/{agreementId}:
 *   get:
 *     summary: Check if current user has signed an agreement
 *     tags: [UserSignatures]
 *     parameters:
 *       - in: path
 *         name: agreementId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     responses:
 *       200:
 *         description: Signature status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signed:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/check/:agreementId', controller.checkSigned);

/**
 * @swagger
 * /api/v1/user-signatures/agreement/{agreementId}:
 *   get:
 *     summary: Get all signatures for an agreement (Admin only)
 *     tags: [UserSignatures]
 *     parameters:
 *       - in: path
 *         name: agreementId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     responses:
 *       200:
 *         description: List of signatures for the agreement
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/agreement/:agreementId', restrictTo('ORG_ADMIN'), controller.getSignaturesByAgreement);

/**
 * @swagger
 * /api/v1/user-signatures/{id}:
 *   get:
 *     summary: Get signature by ID (Admin only)
 *     tags: [UserSignatures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Signature ID
 *     responses:
 *       200:
 *         description: Signature details
 *       404:
 *         description: Signature not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/:id', restrictTo('ORG_ADMIN'), controller.get);

export default router;
