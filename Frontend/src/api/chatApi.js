import api from './axiosConfig';

const BASE = '/chat';

// ─── File Upload ─────────────────────────────────────────────────────────────

export const uploadFile = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`${BASE}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data);
};

// ─── Conversations ──────────────────────────────────────────────────────────

export const getConversations = () =>
  api.get(`${BASE}/conversations`).then((r) => r.data.data.conversations);

export const startDirectConversation = (targetUserId) =>
  api.post(`${BASE}/conversations/direct`, { targetUserId }).then((r) => r.data.data.conversation);

export const createGroupConversation = (name, participantIds, avatar) =>
  api.post(`${BASE}/conversations/group`, { name, participantIds, avatar }).then((r) => r.data.data.conversation);

export const getConversation = (id) =>
  api.get(`${BASE}/conversations/${id}`).then((r) => r.data.data.conversation);

// ─── Messages ────────────────────────────────────────────────────────────────

export const getMessages = (conversationId, cursor, limit = 50) =>
  api.get(`${BASE}/conversations/${conversationId}/messages`, { params: { cursor, limit } }).then((r) => r.data.data);

export const sendMessage = (conversationId, payload) =>
  api.post(`${BASE}/conversations/${conversationId}/messages`, payload).then((r) => r.data.data.message);

export const editMessage = (conversationId, messageId, content) =>
  api.patch(`${BASE}/conversations/${conversationId}/messages/${messageId}`, { content }).then((r) => r.data.data.message);

export const deleteMessage = (conversationId, messageId) =>
  api.delete(`${BASE}/conversations/${conversationId}/messages/${messageId}`).then((r) => r.data.data);

export const markRead = (conversationId) =>
  api.post(`${BASE}/conversations/${conversationId}/read`).then((r) => r.data.data);

// ─── User Search ────────────────────────────────────────────────────────────

export const searchUsers = (q, role) =>
  api.get(`${BASE}/users/search`, { params: { q, role } }).then((r) => r.data.data.users);

// ─── Participants ────────────────────────────────────────────────────────────

export const addParticipants = (conversationId, userIds) =>
  api.post(`${BASE}/conversations/${conversationId}/participants`, { userIds }).then((r) => r.data.data);

export const leaveConversation = (conversationId) =>
  api.delete(`${BASE}/conversations/${conversationId}/leave`).then((r) => r.data.data);

// ─── Invitations ─────────────────────────────────────────────────────────────

export const sendInvitation = (targetUserId, message) =>
  api.post(`${BASE}/invitations`, { targetUserId, message }).then((r) => r.data.data);

export const getInvitations = () =>
  api.get(`${BASE}/invitations`).then((r) => r.data.data.invitations);
