import * as repo from './chat.repository.js';
import AppError from '../../utils/AppError.js';

// ─── Conversations ──────────────────────────────────────────────────────────

export const getOrCreateDirectConversation = async (userId, targetUserId) => {
  if (userId === targetUserId) throw new AppError('Cannot start conversation with yourself', 400);

  const existing = await repo.findDirectConversation(userId, targetUserId);
  if (existing) return existing;

  return repo.createConversation('DIRECT', {
    createdById: userId,
    participantIds: [userId, targetUserId],
  });
};

export const createGroupConversation = async (userId, { name, participantIds, avatar }) => {
  const allIds = [...new Set([userId, ...participantIds])];
  return repo.createConversation('GROUP', {
    name,
    avatar,
    createdById: userId,
    participantIds: allIds,
  });
};

export const getUserConversations = async (userId) => {
  return repo.getUserConversations(userId);
};

export const getConversation = async (conversationId, userId) => {
  const conversation = await repo.getConversationById(conversationId, userId);
  if (!conversation) throw new AppError('Conversation not found', 404);
  return conversation;
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const getMessages = async (conversationId, userId, cursor, limit) => {
  const ok = await repo.isParticipant(conversationId, userId);
  if (!ok) throw new AppError('Access denied', 403);
  return repo.getMessages(conversationId, cursor, limit);
};

export const sendMessage = async (conversationId, userId, payload) => {
  const ok = await repo.isParticipant(conversationId, userId);
  if (!ok) throw new AppError('Access denied', 403);
  return repo.createMessage({ conversationId, senderId: userId, ...payload });
};

export const editMessage = async (messageId, userId, content) => {
  return repo.editMessage(messageId, userId, content);
};

export const deleteMessage = async (messageId, userId) => {
  return repo.deleteMessage(messageId, userId);
};

// ─── Read Receipts ──────────────────────────────────────────────────────────

export const markRead = async (conversationId, userId) => {
  const ok = await repo.isParticipant(conversationId, userId);
  if (!ok) throw new AppError('Access denied', 403);
  return repo.markConversationRead(conversationId, userId);
};

// ─── User Search ────────────────────────────────────────────────────────────

export const searchUsers = async (query, currentUserId, role) => {
  return repo.searchUsers(query, currentUserId, role);
};

// ─── Participant Management ──────────────────────────────────────────────────

export const addParticipants = async (conversationId, requesterId, userIds) => {
  const ok = await repo.isParticipant(conversationId, requesterId);
  if (!ok) throw new AppError('Access denied', 403);
  return repo.addParticipants(conversationId, userIds);
};

export const leaveConversation = async (conversationId, userId) => {
  return repo.removeParticipant(conversationId, userId);
};

// ─── Invitations ─────────────────────────────────────────────────────────────

export const sendInvitation = async (senderId, targetUserId, message) => {
  if (senderId === targetUserId) throw new AppError('Cannot invite yourself', 400);

  // Get or create a conversation
  const conversation = await getOrCreateDirectConversation(senderId, targetUserId);

  // Create the invitation record
  const invitation = await repo.createInvitation({
    senderId,
    receiverId: targetUserId,
    message,
    conversationId: conversation.id,
  });

  // Send the invitation as a SYSTEM message
  const systemMsg = await repo.createMessage({
    conversationId: conversation.id,
    senderId,
    content: `HackRact System: You have a new invitation / job offer.`,
    type: 'SYSTEM',
  });

  // Send the actual message
  const chatMsg = await repo.createMessage({
    conversationId: conversation.id,
    senderId,
    content: message,
    type: 'TEXT',
  });

  return { invitation, conversation, systemMessage: systemMsg, message: chatMsg };
};

export const getUserInvitations = async (userId) => {
  return repo.getUserInvitations(userId);
};

// ─── Presence ────────────────────────────────────────────────────────────────

export const getPresences = async (userIds) => {
  return repo.getUserPresences(userIds);
};
