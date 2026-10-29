import { vi } from "@/messages/vi";
import { ApiError } from "./errors";

/** Thông điệp tiếng Việt cho người dùng theo mã lỗi (không hiển thị message thô của backend). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return vi.errors[e.code] ?? vi.errors.UNKNOWN!;
  return vi.errors.UNKNOWN!;
}
