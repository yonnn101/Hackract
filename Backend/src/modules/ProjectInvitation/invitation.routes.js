import express from 'express';
import * as controller from './invitation.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: ProjectInvitations
 *   description: Project invitation management — org sends, hacker responds
 */

/**
 * @swagger
 * /api/v1/invitations:
 *   post:
 *     summary: Send a project invitation to a hacker (Org Admin only)
 *     tags: [ProjectInvitations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pentestId, hackerId]
 *             properties:
 *               pentestId:
 *                 type: string
 *                 format: uuid
 *               hackerId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               agreement:
 *                 type: object
 *                 required: [source, fileUrl, fileName]
 *                 properties:
 *                   source:
 *                     type: string
 *                     enum: [UPLOAD, LEGAL_AGREEMENT]
 *                   legalAgreementId:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   fileUrl:
 *                     type: string
 *                   fileName:
 *                     type: string
 *                   fileSize:
 *                     type: integer
 *                   fileMime:
 *                     type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       409:
 *         description: Hacker already has a pending invitation
 *       404:
 *         description: Project or hacker not found
 */
router.post('/', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), controller.send);

/**
 * @swagger
 * /api/v1/invitations/mine:
 *   get:
 *     summary: Get my received invitations (Hacker only)
 *     tags: [ProjectInvitations]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, REVOKED, EXPIRED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of invitations
 */
router.get('/mine', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.listMine);

/**
 * @swagger
 * /api/v1/invitations/mine/count:
 *   get:
 *     summary: Count pending invitations for badge (Hacker only)
 *     tags: [ProjectInvitations]
 *     responses:
 *       200:
 *         description: Pending invitation count
 */
router.get('/mine/count', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.countMine);

/**
 * @swagger
 * /api/v1/invitations/project/{pentestId}:
 *   get:
 *     summary: List all invitations for a project (Org Admin only)
 *     tags: [ProjectInvitations]
 *     parameters:
 *       - in: path
 *         name: pentestId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of invitations
 */
router.get('/project/:pentestId', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), controller.listForProject);

/**
 * @swagger
 * /api/v1/invitations/{id}/respond:
 *   patch:
 *     summary: Accept or reject an invitation (Hacker only)
 *     tags: [ProjectInvitations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *               signedFile:
 *                 type: object
 *                 required: [fileUrl, fileName]
 *                 properties:
 *                   fileUrl:
 *                     type: string
 *                   fileName:
 *                     type: string
 *                   fileSize:
 *                     type: integer
 *                   fileMime:
 *                     type: string
 *     responses:
 *       200:
 *         description: Response recorded
 *       409:
 *         description: Invitation already responded
 *       410:
 *         description: Invitation expired
 */
router.patch('/:id/respond', restrictTo('PENTESTER', 'PROJECT_ADMIN'), controller.respond);

/**
 * @swagger
 * /api/v1/invitations/{id}:
 *   delete:
 *     summary: Revoke a pending invitation (Org Admin only)
 *     tags: [ProjectInvitations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation revoked
 *       409:
 *         description: Invitation is not in PENDING state
 */
router.delete('/:id', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), controller.revoke);

export default router;
