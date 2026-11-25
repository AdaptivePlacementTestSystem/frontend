import { NextResponse } from "next/server";
import { z } from "zod";
import { bffError, postUpstream, rateLimitedResponse } from "@/lib/api/bff-upstream";
import { setTokenCookie } from "@/lib/auth/cookie";
import { toCurrentUser } from "@/lib/auth/user";
import type { paths } from "@/lib/api/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

type LoginOperation = paths["/api/v1/auth/login"]["post"];
type LoginRequest = LoginOperation["requestBody"]["content"]["application/json"];
type LoginResponse = LoginOperation["responses"][200]["content"]["application/json"];
const upstreamSchema: z.ZodType<LoginResponse> = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    role: z.string(),
    mustChangePassword: z.boolean().optional(),
  }),
});

/** Đăng nhập qua BFF: gọi backend, đặt token vào cookie httpOnly, chỉ trả thông tin người dùng cho trình duyệt. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bffError(400, "VALIDATION_FAILED", "Thiếu thông tin đăng nhập.");

  const loginBody: LoginRequest = parsed.data;
  const upstream = await postUpstream("/auth/login", loginBody); // đăng nhập chỉ bằng email + mật khẩu (DC-02, DC-14)
  if (!upstream) return bffError(502, "NETWORK", "Không kết nối được máy chủ.");

  if (!upstream.ok) {
    // 401 ⇒ sai thông tin; 403 ⇒ tài khoản bị khóa (is_active=false). Không tiết lộ ô nào sai.
    if (upstream.status === 401 || upstream.status === 400) {
      return bffError(401, "INVALID_CREDENTIALS", "Thông tin đăng nhập không chính xác.");
    }
    if (upstream.status === 403) return bffError(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa.");
    if (upstream.status === 429) return rateLimitedResponse(upstream);
    return bffError(502, "UNKNOWN", "Máy chủ gặp lỗi, vui lòng thử lại.");
  }

  const body = upstreamSchema.safeParse(upstream.data);
  if (!body.success) return bffError(502, "UNKNOWN", "Phản hồi đăng nhập không hợp lệ.");
  const { accessToken } = body.data;
  const user = toCurrentUser(body.data.user);
  if (!accessToken || !user) return bffError(502, "UNKNOWN", "Phản hồi đăng nhập không hợp lệ.");

  // BR-05: tài khoản mới (mật khẩu tạm) phải đổi mật khẩu trước khi dùng hệ thống
  const mustChangePassword = body.data.user.mustChangePassword === true;

  const res = NextResponse.json({ user, mustChangePassword });
  setTokenCookie(res, accessToken);
  return res;
}
