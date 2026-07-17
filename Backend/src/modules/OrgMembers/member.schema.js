import { z } from "zod";

export const addMemberSchema = z.object({
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
    canCreatePentests: z.boolean().default(false),
    canInviteMembers: z.boolean().default(false)
});

export const updateMemberSchema = z.object({
    role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
    canCreatePentests: z.boolean().optional(),
    canInviteMembers: z.boolean().optional()
});
