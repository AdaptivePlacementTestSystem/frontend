import { toast } from "sonner";
import { errorMessage } from "./error-message";

/**
 * Hiện lỗi cho người dùng bằng thông báo nổi (toast). Mọi lỗi từ API đều phải đi qua đây hoặc hiện inline;
 * `id` theo nội dung để cùng một lỗi lặp lại không chồng nhiều thông báo.
 */
export function notifyError(e: unknown): string {
  const message = errorMessage(e);
  toast.error(message, { id: message });
  return message;
}
