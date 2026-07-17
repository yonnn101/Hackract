import express from 'express';
import * as controller from './workflow.controller.js';
import { protect } from '../../middleware/Auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Workflows
 *   description: Workflow graph management APIs
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/workflows:
 *   post:
 *     summary: Create a new workflow for a pentest
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pentestId
 *             properties:
 *               name:
 *                 type: string
 *               pentestId:
 *                 type: string
 *               nodes:
 *                 type: array
 *               edges:
 *                 type: array
 *     responses:
 *       201:
 *         description: Workflow created
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/workflows/pentest/{pentestId}:
 *   get:
 *     summary: Get all workflows for a pentest
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: pentestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of workflows
 */
router.get('/pentest/:pentestId', controller.getByPentest);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow details
 */
router.get('/:id', controller.get);

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   patch:
 *     summary: Update workflow state (nodes/edges)
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nodes:
 *                 type: array
 *               edges:
 *                 type: array
 *     responses:
 *       200:
 *         description: Workflow updated
 */
router.patch('/:id', controller.update);

export default router;
