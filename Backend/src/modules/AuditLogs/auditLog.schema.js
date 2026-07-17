import { z } from "zod";

export const createAuditLogSchema = z.object({
    action: z.string().min(3),
    details: z.any().optional(),
    organizationId: z.string().uuid().optional(),
    pentestId: z.string().uuid().optional()
});
