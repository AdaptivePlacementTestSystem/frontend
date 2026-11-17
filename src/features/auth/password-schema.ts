import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { vi } from "@/messages/vi";

/**
 * Mật khẩu mới theo BR-06 (Quyết định #134 D4): độ dài tối thiểu đọc từ cấu hình (Q-4) và bắt buộc đủ chữ thường,
 * chữ hoa, chữ số, ký tự đặc biệt. Kiểm ở giao diện để báo đúng lý do; backend vẫn kiểm lại (nguồn chân lý).
 */
export const newPasswordSchema = z
  .string()
  .min(1, vi.auth.required)
  .min(PASSWORD_MIN_LENGTH, vi.auth.passwordTooShort(PASSWORD_MIN_LENGTH))
  .regex(/[a-z]/, vi.auth.passwordPolicy)
  .regex(/[A-Z]/, vi.auth.passwordPolicy)
  .regex(/\d/, vi.auth.passwordPolicy)
  .regex(/[^A-Za-z0-9]/, vi.auth.passwordPolicy);

export const emailSchema = z
  .string()
  .trim()
  .min(1, vi.auth.required)
  .pipe(z.email(vi.auth.emailInvalid));
