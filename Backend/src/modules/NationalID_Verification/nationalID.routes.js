import express from 'express';
import * as controller from './nationalID.controller.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';
import { validate } from '../auth/auth.schema.js';
import { 
    createSchema, 
    readSchema, 
    updateSchema, 
    paramIdSchema 
} from './nationalID.crud.schema.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: National ID Verification
 *   description: CRUD operations for National ID Registry
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NationalIDRequest:
 *       type: object
 *       required:
 *         - fan
 *         - email
 *       properties:
 *         fan:
 *           type: string
 *           description: 16-digit numeric Fayda Access Number
 *           example: "1234567890123456"
 *         email:
 *           type: string
 *           description: Official contact email
 *           example: user@example.com
 *         firstName:
 *           type: string
 *           example: Yonas
 *         middleName:
 *           type: string
 *           example: Esubalew
 *         lastName:
 *           type: string
 *           example: Bekele
 *     NationalIDUpdateRequest:
 *       type: object
 *       properties:
 *         fan:
 *           type: string
 *           description: 16-digit numeric Fayda Access Number
 *           example: "1234567890123456"
 *         email:
 *           type: string
 *           description: Official contact email
 *           example: user@example.com
 *         firstName:
 *           type: string
 *           example: Yonas
 *         middleName:
 *           type: string
 *           example: Esubalew
 *         lastName:
 *           type: string
 *           example: Bekele
 */

/**
 * @swagger
 * /national-id:
 *   post:
 *     summary: Create a National ID record
 *     tags: [National ID Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalIDRequest'
 *     responses:
 *       201:
 *         description: Created successfully
 *   get:
 *     summary: Read National ID records
 *     tags: [National ID Verification]
 *     parameters:
 *       - in: query
 *         name: fan
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *   delete:
 *     summary: Delete all National ID records
 *     tags: [National ID Verification]
 *     responses:
 *       200:
 *         description: All records deleted successfully
 * 
 * /national-id/initiate-verification:
 *   post:
 *     summary: Initiate National ID Verification (Sends OTP)
 *     tags: [National ID Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fan]
 *             properties:
 *               fan:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent
 * 
 * /national-id/verify-otp:
 *   post:
 *     summary: Verify National ID OTP
 *     tags: [National ID Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fan, otp]
 *             properties:
 *               fan:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully verified
 * 
 * /national-id/{id}:
 *   get:
 *     summary: Get a National ID record by ID
 *     tags: [National ID Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The citizen ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a National ID record by ID
 *     tags: [National ID Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The citizen ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NationalIDUpdateRequest'
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a National ID record by ID
 *     tags: [National ID Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The citizen ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */

// Route mappings
router.post('/initiate-verification', protect, controller.initiateVerification);
router.post('/verify-otp', protect, controller.verifyOtp);
router.get('/status', protect, controller.getStatus);

router.post('/', protect, validate(createSchema), controller.create);
router.get('/', protect, restrictTo('ORG_ADMIN'), controller.getAll);
router.delete('/', protect, restrictTo('ORG_ADMIN'), controller.removeAll);

router.get('/:id', protect, restrictTo('ORG_ADMIN'), controller.getById);
router.put('/:id', protect, restrictTo('ORG_ADMIN'), validate(updateSchema), controller.update);
router.delete('/:id', protect, restrictTo('ORG_ADMIN'), controller.remove);

export default router;
