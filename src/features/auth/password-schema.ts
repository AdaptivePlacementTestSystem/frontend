import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { vi } from "@/messages/vi";

/** Mật khẩu mới theo BR-06: độ dài tối thiểu đọc từ cấu hình (Q-4). */
export const newPasswordSchema = z
  .string()
  .min(1, vi.auth.required)
  .min(PASSWORD_MIN_LENGTH, vi.auth.passwordTooShort(PASSWORD_MIN_LENGTH));

export const emailSchema = z
  .string()
  .trim()
  .min(1, vi.auth.required)
  .pipe(z.email(vi.auth.emailInvalid));
