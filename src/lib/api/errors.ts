import { ErrorCode } from "@apt/shared-types";

/** Mã nghiệp vụ từ API (nguồn: @apt/shared-types) + mã chỉ phát sinh phía client. FE chỉ `switch(code)`, không so chuỗi tiếng Việt. */
export type ApiErrorCode =
  `${ErrorCode}` | "NETWORK" | "TIMEOUT" | "CURRENT_PASSWORD_INVALID" | "UNKNOWN";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  is(...codes: ApiErrorCode[]): boolean {
    return codes.includes(this.code);
  }
}

/** Mã do BFF đặt (backend chưa có mã riêng, xem app/api/auth/change-password). */
const BFF_CODES = ["CURRENT_PASSWORD_INVALID"];
const KNOWN: ReadonlySet<string> = new Set<string>([...Object.values(ErrorCode), ...BFF_CODES]);

function fallbackCode(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return "VALIDATION_FAILED";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  return "UNKNOWN";
}

export function parseApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === "object") {
    const raw = payload as Record<string, unknown>;
    const rawCode = typeof raw.code === "string" ? raw.code : "";
    const code: ApiErrorCode = KNOWN.has(rawCode)
      ? (rawCode as ApiErrorCode)
      : fallbackCode(status);
    const message =
      typeof raw.message === "string"
        ? raw.message
        : Array.isArray(raw.message) && typeof raw.message[0] === "string"
          ? raw.message[0]
          : "Lỗi không xác định từ máy chủ";
    return new ApiError(status, code, message, raw.details ?? raw);
  }
  return new ApiError(status, fallbackCode(status), "Lỗi máy chủ (" + status + ")");
}

export const toApiError = parseApiError;
