import express from 'express';
import * as controller from './workflowHistory.controller.js';
import { protect } from '../../middleware/Auth.middleware.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/workflows/{workflowId}/history:
 *   post:
 *     summary: Record a change in workflow history
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
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
 *               details:
 *                 type: object
 *               isSnapshot:
 *                 type: boolean
 *               snapshot:
 *                 type: object
 *     responses:
 *       201:
 *         description: History recorded
 */
router.post('/:workflowId/history', controller.recordHistory);

/**
 * @swagger
 * /api/v1/workflows/{workflowId}/history:
 *   get:
 *     summary: Get version history for a workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow history list
 */
router.get('/:workflowId/history', controller.getHistory);

export default router;
