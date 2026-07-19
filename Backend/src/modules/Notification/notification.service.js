import * as repo from './notification.repository.js';

export const pushNotification = async (userId, data, io) => {
  // Save to DB
  const notification = await repo.createNotification({
    userId,
    type: data.type,
    title: data.title,
    message: data.message,
    conversationId: data.conversationId || null,
    pentestId: data.pentestId || null,
    findingId: data.findingId || null,
  });

  // Push to active socket connections
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

export const getUserNotifications = async (userId, cursor, limit = 50) => {
  return repo.getUserNotifications(userId, limit, cursor);
};

export const getUnreadCount = async (userId) => {
  return repo.getUnreadCount(userId);
};

export const markAsRead = async (userId, notificationId) => {
  return repo.markAsRead(userId, notificationId);
};

export const markAllAsRead = async (userId) => {
  return repo.markAllAsRead(userId);
};

export const markChatAsRead = async (userId, conversationId) => {
  return repo.markChatAsRead(userId, conversationId);
};

export const clearNotifications = async (userId) => {
  return repo.clearNotifications(userId);
};
