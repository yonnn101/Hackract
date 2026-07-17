import express from 'express';
import * as controller from './agent.controller.js';
import { protect } from '../../middleware/Auth.middleware.js';
import { checkLegalSignature } from '../../middleware/legalSignature.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AiAgents
 *   description: AI Agent session management APIs
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/ai-agents:
 *   post:
 *     summary: Create a new AI agent session
 *     tags: [AiAgents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pentestId
 *             properties:
 *               pentestId:
 *                 type: string
 *               userId:
 *                 type: string
 *               sessionData:
 *                 type: object
 *     responses:
 *       201:
 *         description: AI agent session created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *
 *   get:
 *     summary: Get all AI agent sessions
 *     tags: [AiAgents]
 *     parameters:
 *       - in: query
 *         name: pentestId
 *         schema:
 *           type: string
 *         description: Filter by pentest ID
 *     responses:
 *       200:
 *         description: List of AI agent sessions
 *       401:
 *         description: Unauthorized
 */
router.post('/', checkLegalSignature, controller.create);
router.get('/', controller.list);
router.get('/health', controller.health);

/**
 * @swagger
 * /api/v1/ai-agents/{id}:
 *   get:
 *     summary: Get AI agent session by ID
 *     tags: [AiAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent session ID
 *     responses:
 *       200:
 *         description: Agent session details
 *       404:
 *         description: Agent session not found
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update AI agent session
 *     tags: [AiAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Agent session updated successfully
 *       404:
 *         description: Agent session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', controller.get);
router.get('/:id/logs', controller.logs);
router.patch('/:id', checkLegalSignature, controller.update);

router.post('/:id/chat', checkLegalSignature, controller.chat);
router.post('/:id/chat/stream', checkLegalSignature, controller.chatStream);
router.post('/:id/stop', checkLegalSignature, controller.stop);
router.post('/:id/test', checkLegalSignature, controller.test);
router.post('/:id/deploy', checkLegalSignature, controller.deploy);

export default router;
