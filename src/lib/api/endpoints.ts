import { apiDownload, apiRequest, type DownloadResult } from "./client";
import { normalizeNextItem } from "./normalize";
import { type ItemStatusValue as ItemStatus } from "@apt/shared-types";
import type {
  AccountKind,
  AccountPage,
  AccountQuery,
  ActiveSessionResponse,
  AdminAccount,
  AssignableRole,
  ClassDistribution,
  CreateAccountBody,
  SystemOverview,
  UpdateAccountBody,
  ClassErrorPattern,
  CurrentUser,
  ExplanationContent,
  ExportType,
  HistoryRow,
  ItemDetail,
  ItemFilters,
  ItemInput,
  ItemRow,
  NextItemResult,
  OptionKey,
  Paged,
  ReviewEntry,
  SessionResult,
  StartSessionResponse,
  StudentProfileView,
  SubmitResult,
} from "./types";

/**
 * MỘT nơi duy nhất liệt kê route API (đổi tên route ở backend chỉ sửa ở đây). Đường dẫn tính từ prefix `api/v1`
 * và đi qua BFF `/api/proxy`. Chỗ lệch với SRS X ghi chú bên cạnh.
 */
export const endpoints = {
  me: () => "/auth/me",
  startSession: () => "/sessions",
  activeSession: () => "/sessions/active",
  nextItem: (id: string) => `/sessions/${id}/next-item`,
  submit: (id: string) => `/sessions/${id}/responses`,
  resume: (id: string) => `/sessions/${id}/resume`,
  result: (id: string) => `/sessions/${id}/result`,
  review: (id: string) => `/sessions/${id}/review`,
  history: (studentCode: string) =>
    `/placement-profiles/${encodeURIComponent(studentCode)}/history`,
  profile: (studentCode: string) => `/placement-profiles/${encodeURIComponent(studentCode)}`,
  items: () => "/items",
  item: (id: string) => `/items/${id}`,
  generateExplanation: () => "/items/generate-explanation", // TODO-CONFIRM (K4d): chưa có trong hợp đồng BE
  classDistribution: () => "/reports/class-distribution", // code hiện tại: /reports/distribution (G-11)
  errorPatterns: () => "/reports/error-patterns",
  exportCsv: () => "/reports/export-csv",
  overview: () => "/reports/overview", // F-29 (S36), chỉ ADMIN
  accounts: (kind: AccountKind) => (kind === "STUDENT" ? "/students" : "/teachers"), // F-22 (S24)
  account: (kind: AccountKind, id: string) =>
    `${kind === "STUDENT" ? "/students" : "/teachers"}/${encodeURIComponent(id)}`,
  // Thao tác tài khoản dùng chung SV/GV (chốt 14/11/2026: gộp về /users/:id/...)
  accountAction: (id: string, action: "lock" | "unlock" | "resend-temporary-password" | "role") =>
    `/users/${encodeURIComponent(id)}/${action}`,
} as const;

// ───────── Xác thực ─────────
export const getMe = (signal?: AbortSignal) => apiRequest<CurrentUser>(endpoints.me(), { signal });

// ───────── Phiên thi ─────────
/** BE bắt buộc `examRoundId` (DC-07, DC-20). TODO S03/S04: màn chọn kỳ thi gọi với id kỳ; chưa có GET /exam-rounds/mine ở BE. */
export const startSession = (examRoundId?: string) =>
  apiRequest<StartSessionResponse>(endpoints.startSession(), {
    method: "POST",
    body: { examRoundId },
  });

export const getActiveSession = (signal?: AbortSignal) =>
  apiRequest<ActiveSessionResponse>(endpoints.activeSession(), { signal });

export async function getNextItem(
  sessionId: string,
  signal?: AbortSignal,
): Promise<NextItemResult> {
  const raw = await apiRequest<unknown>(endpoints.nextItem(sessionId), { signal });
  return normalizeNextItem(raw);
}

export const submitResponse = (
  sessionId: string,
  body: { itemId: string; response: OptionKey; responseTimeMs?: number },
) => apiRequest<SubmitResult>(endpoints.submit(sessionId), { method: "POST", body });

export const getResult = (sessionId: string, signal?: AbortSignal) =>
  apiRequest<SessionResult>(endpoints.result(sessionId), { signal });

export const getReview = (sessionId: string, signal?: AbortSignal) =>
  apiRequest<ReviewEntry[]>(endpoints.review(sessionId), { signal });

export const getHistory = (studentCode: string, signal?: AbortSignal) =>
  apiRequest<HistoryRow[]>(endpoints.history(studentCode), { signal });

export const getStudentProfile = (studentCode: string, signal?: AbortSignal) =>
  apiRequest<StudentProfileView>(endpoints.profile(studentCode), { signal });

// ───────── Ngân hàng câu hỏi ─────────
export const listItems = (filters: ItemFilters, signal?: AbortSignal) =>
  apiRequest<Paged<ItemRow>>(endpoints.items(), { query: { ...filters }, signal });

export const getItem = (id: string, signal?: AbortSignal) =>
  apiRequest<ItemDetail>(endpoints.item(id), { signal });

/** @deprecated DC-32: BE không còn POST /items; chỉ phục vụ item-form (giữ làm tham khảo, không có route). */
export const createItem = (
  body: ItemInput & { submit?: ItemStatus | "DRAFT" | "FIRST_APPROVED" | "FINAL_APPROVED" },
) => apiRequest<ItemDetail>(endpoints.items(), { method: "POST", body });

/** @deprecated DC-32: BE không còn PUT /items/:id. */
export const updateItem = (
  id: string,
  body: ItemInput & { submit?: ItemStatus | "DRAFT" | "FIRST_APPROVED" },
) => apiRequest<ItemDetail>(endpoints.item(id), { method: "PUT", body });

export const generateExplanation = (body: {
  content: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
}) => apiRequest<ExplanationContent>(endpoints.generateExplanation(), { method: "POST", body });

// ───────── Báo cáo (SRS v3.0, lọc theo kỳ thi examRoundId) ─────────
export const getClassDistribution = (examRoundId?: string, signal?: AbortSignal) =>
  apiRequest<ClassDistribution>(endpoints.classDistribution(), {
    query: { examRoundId },
    signal,
  });

export const getClassErrorPatterns = (examRoundId?: string, signal?: AbortSignal) =>
  apiRequest<ClassErrorPattern[]>(endpoints.errorPatterns(), { query: { examRoundId }, signal });

export const downloadCsv = (type: ExportType, examRoundId?: string): Promise<DownloadResult> =>
  apiDownload(endpoints.exportCsv(), { query: { type, examRoundId } });

// ───────── Tổng quan hệ thống (Admin) ─────────
/** `examRoundId` chỉ lọc "SV đã thi" và phân phối CEFR (BR-13); các số còn lại luôn toàn hệ thống. */
export const getSystemOverview = (examRoundId?: string, signal?: AbortSignal) =>
  apiRequest<SystemOverview>(endpoints.overview(), { query: { examRoundId }, signal });

// ───────── Quản lý tài khoản SV/GV (Admin) ─────────
export const listAccounts = (kind: AccountKind, query: AccountQuery, signal?: AbortSignal) =>
  apiRequest<AccountPage>(endpoints.accounts(kind), { query: { ...query }, signal });

export const createAccount = (kind: AccountKind, body: CreateAccountBody) =>
  apiRequest<AdminAccount>(endpoints.accounts(kind), { method: "POST", body });

export const updateAccount = (kind: AccountKind, id: string, body: UpdateAccountBody) =>
  apiRequest<AdminAccount>(endpoints.account(kind, id), { method: "PATCH", body });

export const lockAccount = (id: string) =>
  apiRequest<AdminAccount>(endpoints.accountAction(id, "lock"), { method: "POST" });

export const unlockAccount = (id: string) =>
  apiRequest<AdminAccount>(endpoints.accountAction(id, "unlock"), { method: "POST" });

export const resendTemporaryPassword = (id: string) =>
  apiRequest<AdminAccount>(endpoints.accountAction(id, "resend-temporary-password"), {
    method: "POST",
  });

export const changeAccountRole = (id: string, role: AssignableRole) =>
  apiRequest<AdminAccount>(endpoints.accountAction(id, "role"), {
    method: "PATCH",
    body: { role },
  });
