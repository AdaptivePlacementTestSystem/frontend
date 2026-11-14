import { NextResponse } from "next/server";
import { z } from "zod";
import { bffError, postUpstream, upstreamCode } from "@/lib/api/bff-upstream";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.email().trim(),
  otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

/** Đặt lại mật khẩu bằng OTP (UCSV09). Không tự đăng nhập: không đặt cookie. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bffError(400, "VALIDATION_FAILED", "Dữ liệu chưa hợp lệ.");

  const upstream = await postUpstream("/auth/reset-password", parsed.data);
  if (!upstream) return bffError(502, "NETWORK", "Không kết nối được máy chủ.");
  if (upstream.ok) return new NextResponse(null, { status: 204 });

  if (upstream.status === 429) return bffError(429, "RATE_LIMITED", "Quá nhiều yêu cầu.");
  const known = upstreamCode(upstream.data);
  if (known === "INVALID_RESET_OTP") return bffError(400, known, "Không đặt lại được mật khẩu.");
  // 400 không kèm mã là lỗi kiểm tra dữ liệu của backend (ví dụ mật khẩu mới không đạt chính sách), không phải OTP sai
  if (
    !known &&
    upstream.status === 400 &&
    Array.isArray((upstream.data as { message?: unknown } | null)?.message)
  ) {
    return bffError(400, "VALIDATION_FAILED", "Mật khẩu mới chưa đạt yêu cầu.");
  }
  // Các 400 còn lại coi là OTP sai/hết hạn/đã hủy (BR-14).
  const code = known ?? (upstream.status === 400 ? "INVALID_RESET_OTP" : "UNKNOWN");
  return bffError(code === "INVALID_RESET_OTP" ? 400 : 502, code, "Không đặt lại được mật khẩu.");
}
