import { ApiError, toApiError } from "./errors";

/** Trình duyệt chỉ nói chuyện với BFF cùng nguồn gốc (`/api/proxy/*`); token nằm trong cookie httpOnly. */
export const PROXY_PREFIX = "/api/proxy";
const DEFAULT_TIMEOUT_MS = 15_000;

export type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildUrl(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

function combineSignals(caller: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return caller ? AbortSignal.any([caller, timeout]) : timeout;
}

function networkError(e: unknown, caller?: AbortSignal): Error {
  if (caller?.aborted) return e instanceof Error ? e : new Error("aborted");
  if (e instanceof DOMException && e.name === "TimeoutError") {
    return new ApiError(0, "TIMEOUT", "Hết thời gian chờ phản hồi từ máy chủ.");
  }
  return new ApiError(0, "NETWORK", "Không kết nối được máy chủ.");
}

async function send(fullPath: string, opts: RequestOptions): Promise<Response> {
  const { method = "GET", body, query, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  try {
    return await fetch(buildUrl(fullPath, query), {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combineSignals(signal, timeoutMs),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (e) {
    throw networkError(e, signal);
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Tài khoản còn mustChangePassword ⇒ route khác trả 403 PASSWORD_CHANGE_REQUIRED, FE chuyển về màn đổi mật khẩu (S16). */
function redirectIfPasswordChangeRequired(err: ApiError) {
  if (
    err.code === "PASSWORD_CHANGE_REQUIRED" &&
    typeof window !== "undefined" &&
    window.location.pathname !== "/change-password"
  ) {
    // Tải lại toàn trang có chủ đích: thoát mọi trạng thái React đang bị backend chặn
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/change-password?first=1");
  }
}

/** Gọi API qua BFF, trả JSON đã kiểu hóa; lỗi ⇒ ApiError (có `code`). */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return bffRequest<T>(`${PROXY_PREFIX}${path}`, opts);
}

/** Gọi trực tiếp một route của BFF (ví dụ `/api/auth/login`), không qua proxy tới backend. */
export async function bffRequest<T>(fullPath: string, opts: RequestOptions = {}): Promise<T> {
  const res = await send(fullPath, opts);
  const data = await readBody(res);
  if (!res.ok) {
    const err = toApiError(res.status, data);
    redirectIfPasswordChangeRequired(err);
    throw err;
  }
  return (res.status === 204 ? undefined : data) as T;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
}

/** Tải tệp (CSV) qua BFF. */
export async function apiDownload(
  path: string,
  opts: RequestOptions = {},
): Promise<DownloadResult> {
  const res = await send(`${PROXY_PREFIX}${path}`, opts);
  if (!res.ok) throw toApiError(res.status, await readBody(res));
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await res.blob(), filename: match?.[1] ?? "export.csv" };
}
