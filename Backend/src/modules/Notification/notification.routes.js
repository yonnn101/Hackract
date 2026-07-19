import { Router } from 'express';
import { protect } from '../../middleware/Auth.middleware.js';
import * as controller from './notification.controller.js';

const router = Router();

router.use(protect);

router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/chat/:conversationId/read', controller.markChatAsRead);
router.patch('/:id/read', controller.markAsRead);
router.delete('/', controller.clearNotifications);

export default router;
