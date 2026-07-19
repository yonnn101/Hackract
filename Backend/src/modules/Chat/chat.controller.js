import * as service from './chat.service.js';
import AppError from '../../utils/AppError.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ─── Conversations ──────────────────────────────────────────────────────────

export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await service.getUserConversations(req.user.id);
    ok(res, { conversations });
  } catch (e) { next(e); }
};

export const getUnreadMessagesCount = async (req, res, next) => {
  try {
    const count = await service.getUnreadMessagesCount(req.user.id);
    ok(res, { count });
  } catch (e) { next(e); }
};


export const startDirectConversation = async (req, res, next) => {
  try {
    const conversation = await service.getOrCreateDirectConversation(
      req.user.id,
      req.validated.targetUserId
    );
    ok(res, { conversation }, 201);
  } catch (e) { next(e); }
};

export const createGroup = async (req, res, next) => {
  try {
    const conversation = await service.createGroupConversation(req.user.id, req.validated);
    ok(res, { conversation }, 201);
  } catch (e) { next(e); }
};

export const getConversation = async (req, res, next) => {
  try {
    const conversation = await service.getConversation(req.params.id, req.user.id);
    ok(res, { conversation });
  } catch (e) { next(e); }
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const getMessages = async (req, res, next) => {
  try {
    const { cursor, limit } = req.validated;
    const result = await service.getMessages(req.params.id, req.user.id, cursor, limit);
    ok(res, result);
  } catch (e) { next(e); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await service.sendMessage(req.params.id, req.user.id, req.validated);
    req.app.locals.broadcastChatMessage?.(req.params.id, message);
    ok(res, { message }, 201);
  } catch (e) { next(e); }
};

export const editMessage = async (req, res, next) => {
  try {
    const message = await service.editMessage(req.params.messageId, req.user.id, req.validated.content);
    req.app.locals.broadcastMessageEdit?.(req.params.id, message);
    ok(res, { message });
  } catch (e) { next(e); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    await service.deleteMessage(req.params.messageId, req.user.id);
    req.app.locals.broadcastMessageDelete?.(req.params.id, req.params.messageId);
    ok(res, { deleted: true });
  } catch (e) { next(e); }
};

export const markRead = async (req, res, next) => {
  try {
    await service.markRead(req.params.id, req.user.id);
    ok(res, { read: true });
  } catch (e) { next(e); }
};

// ─── User Search ────────────────────────────────────────────────────────────

export const searchUsers = async (req, res, next) => {
  try {
    const users = await service.searchUsers(req.validated.q, req.user.id, req.validated.role);
    ok(res, { users });
  } catch (e) { next(e); }
};

// ─── Participant Management ──────────────────────────────────────────────────

export const addParticipants = async (req, res, next) => {
  try {
    await service.addParticipants(req.params.id, req.user.id, req.validated.userIds);
    ok(res, { added: true });
  } catch (e) { next(e); }
};

export const leaveConversation = async (req, res, next) => {
  try {
    await service.leaveConversation(req.params.id, req.user.id);
    ok(res, { left: true });
  } catch (e) { next(e); }
};

// ─── Invitations ─────────────────────────────────────────────────────────────

export const sendInvitation = async (req, res, next) => {
  try {
    const result = await service.sendInvitation(
      req.user.id,
      req.validated.targetUserId,
      req.validated.message
    );
    // Broadcast the new message to the conversation
    req.app.locals.broadcastChatMessage?.(result.conversation.id, result.message);
    ok(res, result, 201);
  } catch (e) { next(e); }
};

export const getMyInvitations = async (req, res, next) => {
  try {
    const invitations = await service.getUserInvitations(req.user.id);
    ok(res, { invitations });
  } catch (e) { next(e); }
};

// ─── File Upload ─────────────────────────────────────────────────────────────

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const file = req.file;
    // For S3 uploads, the location is in req.file.location
    const fileUrl = file.location || '';

    ok(res, {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      fileMime: file.mimetype,
    });
  } catch (e) { next(e); }
};
