import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { decodeJwtClaims } from "@/lib/auth/jwt";
import { TOKEN_COOKIE } from "@/lib/auth/roles";
import { toCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const DEFAULT_MAX_AGE_SECONDS = 60 * 60;

function error(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/** Đăng nhập qua BFF: gọi backend, đặt token vào cookie httpOnly, chỉ trả thông tin người dùng cho trình duyệt. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "VALIDATION_FAILED", "Thiếu thông tin đăng nhập.");

  let upstream: Response;
  try {
    // Backend hiện chỉ nhận `email` (LoginDto). Đăng nhập bằng MSSV: TODO-CONFIRM (cần backend hỗ trợ).
    upstream = await fetch(`${env.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: parsed.data.identifier, password: parsed.data.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return error(502, "NETWORK", "Không kết nối được máy chủ.");
  }

  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    // 401 ⇒ sai thông tin; 403 ⇒ tài khoản bị khóa (TODO-CONFIRM mã lỗi chính thức, BE-X11). Không tiết lộ ô nào sai.
    if (upstream.status === 401 || upstream.status === 400) {
      return error(401, "INVALID_CREDENTIALS", "Thông tin đăng nhập không chính xác.");
    }
    if (upstream.status === 403) return error(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa.");
    return error(502, "UNKNOWN", "Máy chủ gặp lỗi, vui lòng thử lại.");
  }

  const body = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
  const user = toCurrentUser(body.user);
  if (!accessToken || !user) return error(502, "UNKNOWN", "Phản hồi đăng nhập không hợp lệ.");

  const exp = decodeJwtClaims(accessToken)?.exp;
  const maxAge = exp ? Math.max(60, Math.floor(exp - Date.now() / 1000)) : DEFAULT_MAX_AGE_SECONDS;

  const res = NextResponse.json({ user });
  res.cookies.set(TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}
