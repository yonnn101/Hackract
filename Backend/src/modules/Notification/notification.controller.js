import * as service from './notification.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const getNotifications = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await service.getUserNotifications(req.user.id, cursor, limit ? parseInt(limit) : 50);
    ok(res, result);
  } catch (e) {
    next(e);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await service.getUnreadCount(req.user.id);
    ok(res, { count });
  } catch (e) {
    next(e);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    await service.markAsRead(req.user.id, req.params.id);
    ok(res, { marked: true });
  } catch (e) {
    next(e);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await service.markAllAsRead(req.user.id);
    ok(res, { markedAll: true });
  } catch (e) {
    next(e);
  }
};

export const markChatAsRead = async (req, res, next) => {
  try {
    await service.markChatAsRead(req.user.id, req.params.conversationId);
    ok(res, { markedChat: true });
  } catch (e) {
    next(e);
  }
};

export const clearNotifications = async (req, res, next) => {
  try {
    await service.clearNotifications(req.user.id);
    ok(res, { cleared: true });
  } catch (e) {
    next(e);
  }
};
