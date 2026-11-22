import { apiDownload, apiRequest, apiUpload, type DownloadResult } from "./client";
import { normalizeNextItem, normalizeReview, normalizeSessionResult } from "./normalize";
import { type ItemStatusValue as ItemStatus } from "@apt/shared-types";
import type {
  AccountKind,
  AccountPage,
  AccountQuery,
  ActiveSessionResponse,
  AdminAccount,
  AssignableRole,
  CurrentRoundSessionResponse,
  ClassDistribution,
  ImportGridRow,
  ImportSaveStatus,
  ImportUploadResult,
  CreateAccountBody,
  SystemOverview,
  UpdateAccountBody,
  ClassErrorPattern,
  CurrentUser,
  ExamRoundDetail,
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
  ResumeSessionResponse,
  ReviewEntry,
  SessionResult,
  StartSessionResponse,
  StudentExamRound,
  StudentProfileView,
  SubmitResult,
  ReviewTasksResponse,
  ConfirmTasksResponse,
  BatchReviewItemsResponse,
  BatchConfirmItemsResponse,
  ReviewItemDetail,
  EditItemInput,
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
  examRoundsMine: () => "/exam-rounds/mine",
  examRoundDetail: (id: string) => `/exam-rounds/${id}`,
  examRoundCurrentSession: (id: string) => `/exam-rounds/${id}/session/current`,
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
  // Import tài khoản bằng file (S19): lưới tạm theo (admin, loại)
  importUpload: () => "/users/import/upload",
  importGrid: () => "/users/import/grid",
  importRow: (rowKey: string) => `/users/import/grid/${encodeURIComponent(rowKey)}`,
  importSave: () => "/users/import/save",
  importStatus: () => "/users/import/save-status",
  importTemplate: () => "/users/import/template",
  accountAction: (id: string, action: "lock" | "unlock" | "resend-temporary-password" | "role") =>
    `/users/${encodeURIComponent(id)}/${action}`,
  // Kiểm duyệt đề thi - Giảng viên (S33, S11, S34, S35)
  teacherReviewTasks: () => "/teacher/tasks/reviews",
  teacherBatchReviewItems: (batchId: string) =>
    `/teacher/tasks/reviews/${encodeURIComponent(batchId)}`,
  teacherConfirmTasks: () => "/teacher/tasks/confirms",
  teacherBatchConfirmItems: (batchId: string) =>
    `/teacher/tasks/confirms/${encodeURIComponent(batchId)}`,
  teacherConfirmAllRemaining: (batchId: string) =>
    `/teacher/tasks/confirms/${encodeURIComponent(batchId)}/confirm-all`,
  teacherEditItem: (id: string) => `/teacher/items/${encodeURIComponent(id)}`,
  teacherApproveItem: (id: string) => `/teacher/items/${encodeURIComponent(id)}/approve`,
  teacherRejectItem: (id: string) => `/teacher/items/${encodeURIComponent(id)}/reject`,
  teacherConfirmItem: (id: string) => `/teacher/items/${encodeURIComponent(id)}/confirm`,
  teacherRemoveItem: (id: string) => `/teacher/items/${encodeURIComponent(id)}/remove`,
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

interface RawActiveSession {
  session?: ActiveSessionResponse["session"];
  activeSessionId?: string;
  sessionId?: string;
  id?: string;
  examRoundId?: string;
  itemCount?: number;
  maxItems?: number;
  expiresAt?: string;
  serverTime?: string;
  closedPrevious?: ActiveSessionResponse["closedPrevious"];
}

export async function getActiveSession(signal?: AbortSignal): Promise<ActiveSessionResponse> {
  const raw = await apiRequest<RawActiveSession | null>(endpoints.activeSession(), { signal });
  if (!raw) return { session: null };
  if ("session" in raw && raw.session !== undefined) return raw as ActiveSessionResponse;
  return {
    session: {
      sessionId: raw.activeSessionId ?? raw.sessionId ?? raw.id ?? "",
      examRoundId: raw.examRoundId,
      itemCount: raw.itemCount ?? 0,
      maxItems: raw.maxItems ?? 25,
      expiresAt: raw.expiresAt ?? new Date().toISOString(),
      serverTime: raw.serverTime ?? new Date().toISOString(),
    },
    closedPrevious: raw.closedPrevious ?? null,
  };
}

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

export async function getResult(sessionId: string, signal?: AbortSignal): Promise<SessionResult> {
  const raw = await apiRequest<unknown>(endpoints.result(sessionId), { signal });
  return normalizeSessionResult(raw);
}

export async function getReview(sessionId: string, signal?: AbortSignal): Promise<ReviewEntry[]> {
  const raw = await apiRequest<unknown>(endpoints.review(sessionId), { signal });
  return normalizeReview(raw);
}

export const resumeSession = (sessionId: string, signal?: AbortSignal) =>
  apiRequest<ResumeSessionResponse>(endpoints.resume(sessionId), { signal });

export const getStudentExamRounds = (signal?: AbortSignal) =>
  apiRequest<StudentExamRound[]>(endpoints.examRoundsMine(), { signal });

export const getExamRoundDetail = (id: string, signal?: AbortSignal) =>
  apiRequest<ExamRoundDetail>(endpoints.examRoundDetail(id), { signal });

export const getCurrentRoundSession = (id: string, signal?: AbortSignal) =>
  apiRequest<CurrentRoundSessionResponse>(endpoints.examRoundCurrentSession(id), { signal });

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

// ───────── Import tài khoản bằng file (Admin, S19) ─────────
export const uploadImportFile = (kind: AccountKind, file: File, signal?: AbortSignal) => {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<ImportUploadResult>(endpoints.importUpload(), form, { query: { kind }, signal });
};

export const getImportGrid = (kind: AccountKind, signal?: AbortSignal) =>
  apiRequest<{ grid: ImportGridRow[] }>(endpoints.importGrid(), { query: { kind }, signal });

export const removeImportRow = (kind: AccountKind, rowKey: string) =>
  apiRequest<{ grid: ImportGridRow[] }>(endpoints.importRow(rowKey), {
    method: "DELETE",
    query: { kind },
  });

export const clearImportGrid = (kind: AccountKind) =>
  apiRequest<void>(endpoints.importGrid(), { method: "DELETE", query: { kind } });

/** Nút Lưu: trả ngay (202); tạo tài khoản chạy nền, theo dõi bằng `getImportStatus`. */
export const saveImportGrid = (kind: AccountKind) =>
  apiRequest<{ total: number }>(endpoints.importSave(), { method: "POST", query: { kind } });

export const getImportStatus = (kind: AccountKind, signal?: AbortSignal) =>
  apiRequest<ImportSaveStatus>(endpoints.importStatus(), { query: { kind }, signal });

export const downloadImportTemplate = (kind: AccountKind): Promise<DownloadResult> =>
  apiDownload(endpoints.importTemplate(), { query: { kind } });

// ───────── Kiểm duyệt câu hỏi cho Giảng viên (S33, S11, S34, S35) ─────────
export const getTeacherReviewTasks = (signal?: AbortSignal) =>
  apiRequest<ReviewTasksResponse>(endpoints.teacherReviewTasks(), { signal });

export const getBatchItemsForReview = (batchId: string, signal?: AbortSignal) =>
  apiRequest<BatchReviewItemsResponse>(endpoints.teacherBatchReviewItems(batchId), { signal });

export const getTeacherConfirmTasks = (signal?: AbortSignal) =>
  apiRequest<ConfirmTasksResponse>(endpoints.teacherConfirmTasks(), { signal });

export const getBatchItemsForConfirm = (batchId: string, signal?: AbortSignal) =>
  apiRequest<BatchConfirmItemsResponse>(endpoints.teacherBatchConfirmItems(batchId), { signal });

export const confirmAllRemainingItems = (batchId: string) =>
  apiRequest<{ message: string; confirmedCount: number }>(
    endpoints.teacherConfirmAllRemaining(batchId),
    { method: "POST" },
  );

export const editTeacherItem = (id: string, body: EditItemInput) =>
  apiRequest<{ message: string; item: ReviewItemDetail }>(endpoints.teacherEditItem(id), {
    method: "PATCH",
    body,
  });

export const approveTeacherItem = (id: string, comment?: string) =>
  apiRequest<{ message: string; item: ReviewItemDetail }>(endpoints.teacherApproveItem(id), {
    method: "POST",
    body: { comment },
  });

export const rejectTeacherItem = (id: string, comment?: string) =>
  apiRequest<{ message: string; item: ReviewItemDetail }>(endpoints.teacherRejectItem(id), {
    method: "POST",
    body: { comment },
  });

export const confirmTeacherItem = (id: string, comment?: string) =>
  apiRequest<{ message: string; item: ReviewItemDetail }>(endpoints.teacherConfirmItem(id), {
    method: "POST",
    body: { comment },
  });

export const removeTeacherItem = (id: string, comment?: string) =>
  apiRequest<{ message: string; item: ReviewItemDetail }>(endpoints.teacherRemoveItem(id), {
    method: "POST",
    body: { comment },
  });
