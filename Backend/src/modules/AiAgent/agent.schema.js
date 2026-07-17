import { z } from "zod";

export const createAgentSchema = z.object({
    assistantId: z.string().uuid().optional(),
    pentestId: z.string().uuid().optional(),
    name: z.string().optional(),
    messages: z.any().optional(),
});

export const chatAgentSchema = z.object({
    message: z.string().min(1).max(65536),
});

export const updateAgentSchema = z.object({
    name: z.string().optional(),
    messages: z.any().optional(),
    tokensUsed: z.number().optional(),
    isActive: z.boolean().optional()
});
