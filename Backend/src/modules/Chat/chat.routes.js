import express from 'express';
import { validateLocal } from '../../middleware/Auth.middleware.js';
import * as controller from './chat.controller.js';
import {
  validate,
  createDirectConversationSchema,
  createGroupConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  getMessagesSchema,
  searchUsersSchema,
  addParticipantsSchema,
  sendInvitationSchema,
} from './chat.schema.js';

import { s3Upload } from '../../utils/s3Upload.js';

const router = express.Router();

router.use(validateLocal);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time chat between organizations and hackers
 */

// ─── File Upload ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/chat/upload:
 *   post:
 *     summary: Upload a file for chat (images, documents, voice, video)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
router.post('/upload', s3Upload.single('file'), controller.uploadFile);

// ─── Conversations ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get all conversations for current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations list
 */
router.get('/conversations', controller.getMyConversations);

/**
 * @swagger
 * /api/v1/chat/conversations/direct:
 *   post:
 *     summary: Start or get direct conversation with a user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 format: uuid
 */
router.post('/conversations/direct', validate(createDirectConversationSchema), controller.startDirectConversation);

/**
 * @swagger
 * /api/v1/chat/conversations/group:
 *   post:
 *     summary: Create a group conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/conversations/group', validate(createGroupConversationSchema), controller.createGroup);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}:
 *   get:
 *     summary: Get a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/conversations/:id', controller.getConversation);

router.post('/conversations/:id/participants', validate(addParticipantsSchema), controller.addParticipants);
router.delete('/conversations/:id/leave', controller.leaveConversation);
router.post('/conversations/:id/read', controller.markRead);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   get:
 *     summary: Get messages in a conversation (paginated)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get('/conversations/:id/messages', validate(getMessagesSchema), controller.getMessages);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/conversations/:id/messages', validate(sendMessageSchema), controller.sendMessage);

router.patch('/conversations/:id/messages/:messageId', validate(editMessageSchema), controller.editMessage);
router.delete('/conversations/:id/messages/:messageId', controller.deleteMessage);

// ─── Invitations ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/chat/invitations:
 *   post:
 *     summary: Send an invitation to a hacker/researcher (org only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId, message]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 */
router.post('/invitations', validate(sendInvitationSchema), controller.sendInvitation);

/**
 * @swagger
 * /api/v1/chat/invitations:
 *   get:
 *     summary: Get invitations received by current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/invitations', controller.getMyInvitations);

// ─── User Search ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/chat/users/search:
 *   get:
 *     summary: Search users to start a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/users/search', validate(searchUsersSchema), controller.searchUsers);

export default router;
