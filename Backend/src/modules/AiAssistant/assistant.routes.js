import express from 'express';
import * as controller from './assistant.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AiAssistants
 *   description: AI Assistant management APIs (Super Admin only)
 */

router.use(protect);

router.post('/generate', controller.generate);

router.use(restrictTo('ORG_ADMIN')); // Managing assistants is admin only

/**
 * @swagger
 * /api/v1/ai-assistants:
 *   post:
 *     summary: Create a new AI assistant
 *     tags: [AiAssistants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Security Advisor
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: AI assistant created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *
 *   get:
 *     summary: Get all AI assistants
 *     tags: [AiAssistants]
 *     responses:
 *       200:
 *         description: List of AI assistants
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post('/', controller.create);
router.get('/', controller.list);

/**
 * @swagger
 * /api/v1/ai-assistants/{id}:
 *   get:
 *     summary: Get AI assistant by ID
 *     tags: [AiAssistants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
 *     responses:
 *       200:
 *         description: Assistant details
 *       404:
 *         description: Assistant not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *
 *   patch:
 *     summary: Update AI assistant
 *     tags: [AiAssistants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Assistant updated successfully
 *       404:
 *         description: Assistant not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *
 *   delete:
 *     summary: Delete AI assistant
 *     tags: [AiAssistants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assistant ID
 *     responses:
 *       204:
 *         description: Assistant deleted successfully
 *       404:
 *         description: Assistant not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/:id', controller.get);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
