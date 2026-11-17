import { vi } from "@/messages/vi";
import { ApiError } from "./errors";

/** Thông điệp tiếng Việt cho người dùng theo mã lỗi (không hiển thị message thô của backend). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // Quá giới hạn: nói rõ phải chờ bao lâu để người dùng biết khi nào thử lại được
    if (e.code === "RATE_LIMITED") {
      const seconds = e.retryAfterSeconds;
      return seconds ? vi.rateLimitedWait(seconds) : vi.errors.RATE_LIMITED!;
    }
    return vi.errors[e.code] ?? vi.errors.UNKNOWN!;
  }
  return vi.errors.UNKNOWN!;
}
