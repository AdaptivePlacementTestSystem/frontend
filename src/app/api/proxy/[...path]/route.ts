import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { TOKEN_COOKIE } from "@/lib/auth/roles";
import { filterResponseHeaders, isAllowedProxyPath } from "@/lib/api/proxy-policy";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;
const MULTIPART_OVERHEAD_BYTES = 65536;
class UploadTooLargeError extends Error {}

function error(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/**
 * BFF: nhận yêu cầu từ trình duyệt, gắn `Authorization: Bearer <token>` lấy từ cookie httpOnly rồi chuyển tới backend.
 * Trình duyệt (JavaScript) không bao giờ thấy token.
 */
/** Thân yêu cầu: văn bản cho JSON, byte nguyên vẹn cho multipart/nhị phân. */
async function readBody(req: NextRequest): Promise<string | ArrayBuffer> {
  const type = req.headers.get("content-type") ?? "";
  if (type.startsWith("application/json") || type.startsWith("text/")) return req.text();
  if (!type.startsWith("multipart/form-data")) return req.arrayBuffer();
  const limit = (env.IMPORT_MAX_FILE_BYTES ?? 2097152) + MULTIPART_OVERHEAD_BYTES;
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new UploadTooLargeError();
  const reader = req.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new UploadTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

async function handle(req: NextRequest, ctx: RouteContext<"/api/proxy/[...path]">) {
  const { path } = await ctx.params;
  if (!isAllowedProxyPath(path)) return error(404, "NOT_FOUND", "Không tìm thấy.");

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return error(401, "UNAUTHENTICATED", "Chưa đăng nhập.");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const isUpload =
    path.join("/") === "users/import/upload" ||
    /^exam-rounds\/[A-Za-z0-9-]+\/participants\/import\/upload$/.test(path.join("/"));
  if (
    isUpload &&
    req.method === "POST" &&
    !req.headers.get("content-type")?.startsWith("multipart/form-data")
  ) {
    return error(400, "IMPORT_FILE_INVALID", "Yêu cầu phải chứa file multipart.");
  }
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
      // multipart (tải file import) là nhị phân: chuyển nguyên byte, không đọc như văn bản
      body: hasBody ? await readBody(req) : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(
        path.join("/") === "item-batches/generate"
          ? 105_000
          : path.join("/") === "item-batches/import/save"
            ? 60_000
            : UPSTREAM_TIMEOUT_MS,
      ),
    });
  } catch (e) {
    if (e instanceof UploadTooLargeError)
      return error(413, "IMPORT_FILE_INVALID", "File vượt quá dung lượng cho phép.");
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

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
