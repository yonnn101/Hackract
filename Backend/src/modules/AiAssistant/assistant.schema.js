import { z } from "zod";

export const createAssistantSchema = z.object({
    name: z.string().min(3),
    model: z.string().min(3),
    systemPrompt: z.string().min(10),
    capabilities: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional()
});

export const updateAssistantSchema = z.object({
    name: z.string().min(3).optional(),
    model: z.string().min(3).optional(),
    systemPrompt: z.string().min(10).optional(),
    capabilities: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    isActive: z.boolean().optional()
});

const sourceNodeSchema = z.object({
    sourceNodeId: z.string().min(1),
    sourceNodeType: z.string().min(1),
    sourceLabel: z.string().min(1),
    content: z.string().optional().default(''),
    status: z.string().optional(),
    fetchingOutput: z.boolean().optional(),
});

export const generateAssistantResponseSchema = z.object({
    prompt: z.string().trim().optional().default(''),
    context: z.string().trim().optional().default(''),
    assistantId: z.string().uuid().optional(),
    model: z.string().trim().min(1).optional(),
    systemPrompt: z.string().trim().min(1).optional(),
    sourceNodes: z.array(sourceNodeSchema).default([]),
    timeoutMs: z.number().int().positive().optional(),
});
