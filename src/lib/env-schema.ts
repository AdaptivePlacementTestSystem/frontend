import { z } from "zod";

/**
 * Biến môi trường của Frontend, kiểm tra bằng zod. Thiếu/sai ⇒ báo lỗi rõ ngay khi
 * `next build` / `next start` / `next dev` (xem import trong next.config.ts), không đợi đến lúc gọi API.
 * Chỉ biến NEXT_PUBLIC_* mới được lộ ra trình duyệt — không đặt bí mật vào đó.
 */
const envSchema = z.object({
  /** URL gốc của Backend (kèm prefix), chỉ dùng phía server/BFF. Ví dụ: http://localhost:3001/api/v1 */
  API_BASE_URL: z.url({ message: "API_BASE_URL phải là một URL hợp lệ" }),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Adaptive Placement Test"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${details}\nXem .env.example.`);
  }
  return result.data;
}
