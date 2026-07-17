import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3),
  handle: z.string().min(3)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(3).optional(),
  handle: z.string().min(3).optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8)
});
