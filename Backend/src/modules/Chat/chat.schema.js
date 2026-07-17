import { z } from 'zod';

export const createDirectConversationSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const createGroupConversationSchema = z.object({
  name: z.string().min(1).max(100),
  participantIds: z.array(z.string().uuid()).min(1).max(50),
  avatar: z.string().url().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'VIDEO', 'SYSTEM']).default('TEXT'),
  replyToId: z.string().uuid().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  fileMime: z.string().max(100).optional(),
  audioDuration: z.number().int().min(0).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const getMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const searchUsersSchema = z.object({
  q: z.string().max(100).optional().default(''),
  role: z.string().optional(),
});

export const addParticipantsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(20),
});

export const sendInvitationSchema = z.object({
  targetUserId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export function validate(schema) {
  return (req, res, next) => {
    const target = req.method === 'GET' ? req.query : req.body;
    const result = schema.safeParse(target);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validated = result.data;
    next();
  };
}
