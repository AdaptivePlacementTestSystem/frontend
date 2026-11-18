import { vi } from "@/messages/vi";
import { ApiError } from "./errors";

/** Thông điệp tiếng Việt cho người dùng theo mã lỗi. Ưu tiên thông điệp cụ thể khi có validation failed. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // Quá giới hạn: nói rõ phải chờ bao lâu để người dùng biết khi nào thử lại được
    if (e.code === "RATE_LIMITED") {
      const seconds = e.retryAfterSeconds;
      return seconds ? vi.rateLimitedWait(seconds) : vi.errors.RATE_LIMITED!;
    }
    if (
      e.code === "VALIDATION_FAILED" &&
      e.message &&
      e.message !== "Dữ liệu chưa hợp lệ." &&
      e.message !== "Lỗi không xác định từ máy chủ"
    ) {
      return e.message;
    }
    return vi.errors[e.code] ?? e.message ?? vi.errors.UNKNOWN!;
  }
  return vi.errors.UNKNOWN!;
}
