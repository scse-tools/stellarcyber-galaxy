import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

const username = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters.")
  .max(64)
  .regex(/^[a-zA-Z0-9._@-]+$/, "Username may use letters, digits, and . _ @ - only.");

const password = z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

export const setupSchema = z.object({ username, password });
export const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export const createUserSchema = z.object({
  username,
  password,
  role: z.enum(["admin", "user"]),
});
export const updateUserSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  password: password.optional(),
});
