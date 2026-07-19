import api from './axiosConfig';

const BASE = '/notifications';

export const getNotifications = (cursor, limit = 50) =>
  api.get(BASE, { params: { cursor, limit } }).then((r) => r.data.data);

export const getUnreadCount = () =>
  api.get(`${BASE}/unread-count`).then((r) => r.data.data.count);

export const markAsRead = (id) =>
  api.patch(`${BASE}/${id}/read`).then((r) => r.data.data);

export const markChatAsRead = (conversationId) =>
  api.patch(`${BASE}/chat/${conversationId}/read`).then((r) => r.data.data);

export const markAllAsRead = () =>
  api.patch(`${BASE}/read-all`).then((r) => r.data.data);

export const clearNotifications = () =>
  api.delete(BASE).then((r) => r.data.data);
