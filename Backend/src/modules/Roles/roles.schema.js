import { z } from "zod";
import { RoleTypes } from './roles.constants.js';

export const createRoleSchema = z.object({
    name: z.string().min(2),
    type: z.nativeEnum(RoleTypes),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional()
});

export const updateRoleSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional()
});
