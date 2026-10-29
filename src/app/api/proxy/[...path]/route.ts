import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { TOKEN_COOKIE } from "@/lib/auth/roles";
import { filterResponseHeaders, isAllowedProxyPath } from "@/lib/api/proxy-policy";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;

function error(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/**
 * BFF: nhận yêu cầu từ trình duyệt, gắn `Authorization: Bearer <token>` lấy từ cookie httpOnly rồi chuyển tới backend.
 * Trình duyệt (JavaScript) không bao giờ thấy token.
 */
async function handle(req: NextRequest, ctx: RouteContext<"/api/proxy/[...path]">) {
  const { path } = await ctx.params;
  if (!isAllowedProxyPath(path)) return error(404, "NOT_FOUND", "Không tìm thấy.");

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return error(401, "UNAUTHENTICATED", "Chưa đăng nhập.");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: "application/json, text/csv",
  };
  if (hasBody) headers["content-type"] = req.headers.get("content-type") ?? "application/json";

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_BASE_URL}/${path.join("/")}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = e instanceof DOMException && e.name === "TimeoutError";
    return timeout
      ? error(504, "TIMEOUT", "Máy chủ phản hồi quá chậm.")
      : error(502, "NETWORK", "Không kết nối được máy chủ.");
  }

  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: filterResponseHeaders(upstream.headers),
  });
  // Token hết hạn/không hợp lệ: xóa cookie để không bị lặp vòng chuyển hướng
  if (upstream.status === 401) res.cookies.delete(TOKEN_COOKIE);
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
