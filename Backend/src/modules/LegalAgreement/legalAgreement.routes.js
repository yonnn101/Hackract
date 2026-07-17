import express from 'express';
import * as controller from './legalAgreement.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';
import { s3Upload } from '../../utils/s3Upload.js';

const router = express.Router();

const setS3Folder = (folder) => (req, res, next) => {
	req.s3Folder = folder;
	next();
};

/**
 * @swagger
 * tags:
 *   name: LegalAgreements
 *   description: Legal agreement management APIs
 */

/**
 * @swagger
 * /api/v1/legal-agreements/active/{type}:
 *   get:
 *     summary: Get active agreement by type (Public)
 *     tags: [LegalAgreements]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [terms_of_service, privacy_policy, nda, sla, TERMS_OF_SERVICE, PRIVACY_POLICY, NDA, SLA]
 *         description: Agreement type
 *     responses:
 *       200:
 *         description: Active agreement details
 *       404:
 *         description: No active agreement found
 */
router.get('/active/:type', controller.getActiveByType);

router.use(protect);

/**
 * @swagger
 * /api/v1/legal-agreements:
 *   post:
 *     summary: Create a new legal agreement (Admin only)
 *     tags: [LegalAgreements]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, type, version, file]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Terms of Service v2.0
 *               type:
 *                 type: string
 *                 enum: [terms_of_service, privacy_policy, nda, sla]
 *               version:
 *                 type: string
 *                 example: 2.0
 *               isActive:
 *                 type: boolean
 *               file:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, content, version]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Terms of Service v2.0
 *               type:
 *                 type: string
 *                 enum: [terms_of_service, privacy_policy, nda, sla]
 *               content:
 *                 type: string
 *               version:
 *                 type: string
 *                 example: 2.0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agreement created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *
 *   get:
 *     summary: Get all legal agreements
 *     tags: [LegalAgreements]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by agreement type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of legal agreements
 *       401:
 *         description: Unauthorized
 */
router.post('/', restrictTo('ORG_ADMIN'), setS3Folder('legal-agreements'), s3Upload.single('file'), controller.create);
router.get('/', controller.list);

/**
 * @swagger
 * /api/v1/legal-agreements/{id}:
 *   get:
 *     summary: Get legal agreement by ID
 *     tags: [LegalAgreements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     responses:
 *       200:
 *         description: Agreement details
 *       404:
 *         description: Agreement not found
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update legal agreement (Admin only)
 *     tags: [LegalAgreements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [terms_of_service, privacy_policy, nda, sla]
 *               version:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               file:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [terms_of_service, privacy_policy, nda, sla]
 *               content:
 *                 type: string
 *               version:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Agreement updated successfully
 *       404:
 *         description: Agreement not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *
 *   delete:
 *     summary: Delete legal agreement (Admin only)
 *     tags: [LegalAgreements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     responses:
 *       204:
 *         description: Agreement deleted successfully
 *       404:
 *         description: Agreement not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/:id', controller.get);
router.patch('/:id', restrictTo('ORG_ADMIN'), setS3Folder('legal-agreements'), s3Upload.single('file'), controller.update);
router.delete('/:id', restrictTo('ORG_ADMIN'), controller.remove);
router.post('/:id/notify', restrictTo('ORG_ADMIN'), controller.notify);

export default router;
