import prisma from '../../database/prismaClient.js';

// ─── Conversations ──────────────────────────────────────────────────────────

export const findDirectConversation = async (userId1, userId2) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      type: 'DIRECT',
      participants: { some: { userId: userId1 } },
    },
    include: { participants: { select: { userId: true } } },
  });
  return conversations.find(
    (c) =>
      c.participants.length === 2 &&
      c.participants.some((p) => p.userId === userId2)
  ) || null;
};

export const createConversation = async (type, data) => {
  return prisma.conversation.create({
    data: {
      type,
      name: data.name,
      avatar: data.avatar,
      createdById: data.createdById,
      participants: {
        create: data.participantIds.map((userId, idx) => ({
          userId,
          role: idx === 0 ? 'admin' : 'member',
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, fullName: true, handle: true, avatar: true } },
        },
      },
    },
  });
};

const USER_SELECT = {
  id: true,
  fullName: true,
  handle: true,
  avatar: true,
  presence: { select: { isOnline: true, lastSeenAt: true } },
  roles: { select: { name: true } },
  organizations: {
    select: { organization: { select: { id: true, name: true } } },
    take: 1,
  },
};

export const getUserConversations = async (userId) => {
  return prisma.conversation.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: { user: { select: USER_SELECT } },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });
};
export const getUnreadMessagesCount = async (userId) => {
  const result = await prisma.conversationParticipant.aggregate({
    where: { userId },
    _sum: { unreadCount: true },
  });
  return result._sum.unreadCount || 0;
};

export const getConversationById = async (conversationId, userId) => {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: { user: { select: USER_SELECT } },
      },
    },
  });
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const getMessages = async (conversationId, cursor, limit = 50) => {
  const take = parseInt(limit, 10);
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
    },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, fullName: true, handle: true, avatar: true } },
      replyTo: {
        include: {
          sender: { select: { id: true, fullName: true, handle: true } },
        },
      },
      readBy: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();
  const nextCursor = hasMore ? messages[messages.length - 1]?.id : null;

  return { messages: messages.reverse(), nextCursor, hasMore };
};

export const createMessage = async (data) => {
  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      type: data.type || 'TEXT',
      replyToId: data.replyToId || null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      fileMime: data.fileMime || null,
      audioDuration: data.audioDuration || null,
    },
    include: {
      sender: { select: { id: true, fullName: true, handle: true, avatar: true } },
      replyTo: {
        include: {
          sender: { select: { id: true, fullName: true, handle: true } },
        },
      },
    },
  });

  // Update last message preview
  let preview = data.content?.substring(0, 100) || '';
  if (data.type === 'VOICE') preview = '🎤 Voice message';
  else if (data.type === 'IMAGE') preview = '📷 Image';
  else if (data.type === 'VIDEO') preview = '🎥 Video';
  else if (data.type === 'FILE') preview = `📎 ${data.fileName || 'File'}`;

  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: preview,
    },
  });

  // Increment unread for all other participants
  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId: data.conversationId,
      userId: { not: data.senderId },
    },
    data: { unreadCount: { increment: 1 } },
  });

  return message;
};

export const editMessage = async (messageId, senderId, content) => {
  return prisma.message.update({
    where: { id: messageId, senderId },
    data: { content, isEdited: true },
    include: {
      sender: { select: { id: true, fullName: true, handle: true, avatar: true } },
    },
  });
};

export const deleteMessage = async (messageId, senderId) => {
  return prisma.message.update({
    where: { id: messageId, senderId },
    data: { deletedAt: new Date() },
  });
};

// ─── Read Receipts ──────────────────────────────────────────────────────────

export const markConversationRead = async (conversationId, userId) => {
  // Reset participant unread count
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { unreadCount: 0, lastReadAt: new Date() },
  });

  // Mark all messages in conversation as read by this user
  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      deletedAt: null,
      readBy: { none: { userId } },
    },
    select: { id: true },
  });

  if (unreadMessages.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data: unreadMessages.map((m) => ({
        messageId: m.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }
};

// ─── Presence ───────────────────────────────────────────────────────────────

export const upsertUserPresence = async (userId, isOnline, socketId = null) => {
  return prisma.userPresence.upsert({
    where: { userId },
    update: {
      isOnline,
      lastSeenAt: new Date(),
      socketId: isOnline ? socketId : null,
    },
    create: {
      userId,
      isOnline,
      lastSeenAt: new Date(),
      socketId: isOnline ? socketId : null,
    },
  });
};

export const getUserPresences = async (userIds) => {
  return prisma.userPresence.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, isOnline: true, lastSeenAt: true },
  });
};

// ─── User Search ─────────────────────────────────────────────────────────────

export const searchUsers = async (query, currentUserId, role) => {
  const hasQuery = query && query.trim().length > 0;
  return prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      status: 'ACTIVE',
      ...(role ? { roles: { some: { OR: [{ name: role }, { type: role }] } } } : {}),
      ...(hasQuery ? {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { handle: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: USER_SELECT,
    orderBy: [
      { fullName: 'asc' },
    ],
    take: 50,
  });
};

// ─── Participant Management ──────────────────────────────────────────────────

export const isParticipant = async (conversationId, userId) => {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!p;
};

export const addParticipants = async (conversationId, userIds) => {
  return prisma.conversationParticipant.createMany({
    data: userIds.map((userId) => ({ conversationId, userId, role: 'member' })),
    skipDuplicates: true,
  });
};

export const removeParticipant = async (conversationId, userId) => {
  return prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  });
};

// ─── Invitations ─────────────────────────────────────────────────────────────

export const createInvitation = async (data) => {
  return prisma.chatInvitation.create({
    data: {
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      conversationId: data.conversationId,
    },
    include: {
      sender: { select: { id: true, fullName: true, handle: true, avatar: true } },
      receiver: { select: { id: true, fullName: true, handle: true, avatar: true } },
      conversation: true,
    },
  });
};

export const getUserInvitations = async (userId) => {
  return prisma.chatInvitation.findMany({
    where: { receiverId: userId },
    include: {
      sender: { select: { id: true, fullName: true, handle: true, avatar: true } },
      conversation: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateInvitationStatus = async (invitationId, status) => {
  return prisma.chatInvitation.update({
    where: { id: invitationId },
    data: { status },
  });
};

export const getOnlineUserCount = async () => {
  return prisma.userPresence.count({
    where: { isOnline: true },
  });
};
