import prisma from '../../database/prismaClient.js';

export const createNotification = async (data) => {
  return prisma.notification.create({
    data,
  });
};

export const getUserNotifications = async (userId, limit = 50, cursor = null) => {
  const query = {
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' },
  };

  if (cursor) {
    query.skip = 1;
    query.cursor = { id: cursor };
  }

  const notifications = await prisma.notification.findMany(query);
  
  const hasMore = notifications.length === limit;
  const nextCursor = hasMore ? notifications[notifications.length - 1].id : null;

  return { notifications, nextCursor, hasMore };
};

export const getUnreadCount = async (userId) => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

export const markAsRead = async (userId, notificationId) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const markChatAsRead = async (userId, conversationId) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      type: 'CHAT_MESSAGE',
      conversationId,
      isRead: false,
    },
    data: { isRead: true },
  });
};

export const clearNotifications = async (userId) => {
  return prisma.notification.deleteMany({
    where: { userId },
  });
};
