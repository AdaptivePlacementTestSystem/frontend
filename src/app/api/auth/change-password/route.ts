import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bffError, postUpstream, upstreamCode } from "@/lib/api/bff-upstream";
import { setTokenCookie } from "@/lib/auth/cookie";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { TOKEN_COOKIE } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

/**
 * Đổi mật khẩu (UCSV08, BR-06): gắn token từ cookie; thành công ⇒ backend cấp lại token (mustChangePassword=false)
 * và BFF ghi đè cookie. Không dùng proxy chung vì proxy xóa cookie khi gặp 401, còn ở đây 400/401 nghĩa là sai mật khẩu hiện tại.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return bffError(401, "UNAUTHENTICATED", "Chưa đăng nhập.");
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bffError(400, "VALIDATION_FAILED", "Dữ liệu chưa hợp lệ.");

  const upstream = await postUpstream("/auth/change-password", parsed.data, token);
  if (!upstream) return bffError(502, "NETWORK", "Không kết nối được máy chủ.");

  if (!upstream.ok) {
    const code = upstreamCode(upstream.data);
    if (code) return bffError(upstream.status, code, "Không đổi được mật khẩu.");
    // TODO-CONFIRM: backend chưa có mã riêng cho "sai mật khẩu hiện tại" (SRS X chỉ ghi POST change-password).
    if (upstream.status === 400 || upstream.status === 401) {
      return bffError(400, "CURRENT_PASSWORD_INVALID", "Mật khẩu hiện tại không đúng.");
    }
    return bffError(502, "UNKNOWN", "Máy chủ gặp lỗi, vui lòng thử lại.");
  }

  const body = (upstream.data && typeof upstream.data === "object" ? upstream.data : {}) as Record<
    string,
    unknown
  >;
  const res = new NextResponse(null, { status: 204 });
  if (typeof body.accessToken === "string") setTokenCookie(res, body.accessToken);
  return res;
}
