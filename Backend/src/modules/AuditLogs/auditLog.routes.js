import express from 'express';
import * as controller from './auditLog.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Audit log management APIs (Admin only)
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get audit logs with filters
 *     tags: [AuditLogs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *       - in: query
 *         name: pentestId
 *         schema:
 *           type: string
 *         description: Filter by pentest ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', restrictTo('ORG_ADMIN'), controller.list);

/**
 * @swagger
 * /api/v1/audit-logs/report:
 *   get:
 *     summary: Generate audit compliance report
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit report generated successfully
 *       403:
 *         description: Forbidden
 */
router.get('/report', restrictTo('ORG_ADMIN'), controller.generateReport);

/**
 * @swagger
 * /api/v1/audit-logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [AuditLogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log details
 *       404:
 *         description: Audit log not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/:id', restrictTo('ORG_ADMIN'), controller.get);

/**
 * @swagger
 * /api/v1/audit-logs:
 *   post:
 *     summary: Create audit log manually
 *     tags: [AuditLogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 example: USER_LOGIN
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *               pentestId:
 *                 type: string
 *               details:
 *                 type: object
 *     responses:
 *       201:
 *         description: Audit log created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post('/', restrictTo('ORG_ADMIN'), controller.create);

export default router;
