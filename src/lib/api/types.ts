import {
  type CefrConfidenceValue as CefrConfidence,
  type CefrLevelValue as CefrLevel,
  type ItemBatchSourceValue as ItemBatchSource,
  type ItemStatusValue as ItemStatus,
  type SessionStatusValue as SessionStatus,
  type SkillValue as Skill,
  type StoppingReasonValue as StoppingReason,
  type UserRoleValue as UserRole,
} from "@apt/shared-types";

/**
 * View-model của giao diện (theo file mô tả màn hình, Mục 2.4). CHƯA phải hợp đồng backend chốt:
 * khi backend có OpenAPI thì thay bằng kiểu sinh tự động (quyết định #51). Mọi chỗ lệch ghi ở adapter/mocks.
 */
export type OptionKey = "A" | "B" | "C" | "D";
export const OPTION_KEYS: readonly OptionKey[] = ["A", "B", "C", "D"] as const;
export type Options = Record<OptionKey, string>;
export type Severity = "LOW" | "MEDIUM" | "HIGH";
/** Mức CEFR mà câu hỏi nhắm tới (ngân hàng đề chỉ có 4 mức). */
export type CefrTarget = "A1" | "A2" | "B1" | "B2";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** MSSV; chỉ sinh viên có. Backend chưa trả (BE-X14) — mock có. */
  studentCode: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

// ───────── Phiên thi ─────────
export interface SessionMeta {
  id: string;
  itemCount: number;
  maxItems: number;
  expiresAt: string;
  serverTime: string;
}

export interface StudentExamRound {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  status: string;
  effectiveStatus: string;
  sessionStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  sessionId?: string;
  scoreCefr?: string | null;
}

export interface ExamRoundDetail {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  status: string;
  effectiveStatus: string;
  sessionStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  sessionId?: string;
  activeSessionId?: string;
}

export interface ExamRoundSummary {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  participantCount?: number;
  sessionCount?: number;
}

export type CurrentRoundSessionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface CurrentRoundSessionResponse {
  status: CurrentRoundSessionStatus;
  sessionId?: string;
  examRoundId?: string;
  startedAt?: string;
  expiresAt?: string;
  serverTime?: string;
  itemCount?: number;
  maxItems?: number;
  currentItem?: ExamItem | null;
  completedAt?: string | null;
  stoppingReason?: string | null;
  isExpired?: boolean;
}

export interface ResumeSessionResponse {
  examRoundId?: string;
  currentItem: ExamItem | null;
  state: Record<string, unknown>;
  isExpired?: boolean;
}

/** Câu hỏi khi thi: KHÔNG có đáp án đúng, KHÔNG có cefrTarget, KHÔNG có irtB (SRS 15.3). */
export interface ExamItem {
  id: string;
  content: string;
  options: Options;
  skill: Skill;
}

export type NextItemResult =
  | { kind: "item"; session: SessionMeta; item: ExamItem }
  | { kind: "finished"; reason: StoppingReason; sessionId: string };

export interface SubmitResult {
  accepted: true;
  shouldStop: boolean;
}

export interface ActiveSession {
  sessionId: string;
  examRoundId?: string;
  itemCount: number;
  maxItems: number;
  expiresAt: string;
  serverTime: string;
}

export interface ActiveSessionResponse {
  session: ActiveSession | null;
  /** Phiên cũ vừa được server đóng do quá hạn (#77): để UI báo cho sinh viên. */
  closedPrevious?: { sessionId: string; status: "COMPLETED" | "ABANDONED" } | null;
}

export interface StartSessionResponse {
  sessionId: string;
}

// ───────── Kết quả ─────────
export interface SkillProfile {
  skill: Skill;
  scorePercent?: number;
  cefrEstimate?: CefrLevel;
  itemsAdministered: number;
  correctCount: number;
}

export interface ErrorPattern {
  topicTag: string;
  skill: Skill;
  itemsAttempted: number;
  correctCount: number;
  accuracyRate: number;
  severity: Severity;
}

export interface SessionResult {
  sessionId: string;
  completedAt: string | null;
  cefrLevel: CefrLevel;
  cefrConfidence: CefrConfidence;
  boundaryEffect: boolean;
  ability: { theta: number | null; standardError: number | null; ci95: [number, number] | null };
  skillProfiles: SkillProfile[];
  errorPatterns: ErrorPattern[];
  aiRecommendations: string[];
  meta: {
    itemsAdministered: number;
    durationSeconds: number;
    stoppingReason: StoppingReason | null;
  };
}

/** Giải thích AI (quyết định #78): JSON có phiên bản trong `explanations.content`. */
export interface ExplanationContent {
  v: 1;
  general: string;
  options: Partial<Record<OptionKey, string>>;
}
export type RawExplanation = null | ExplanationContent | string;

export interface ReviewEntry {
  order: number;
  content: string;
  options: Options;
  chosen: OptionKey;
  correct: OptionKey;
  isCorrect: boolean;
  skill?: Skill;
  explanation: RawExplanation;
}

export interface HistoryRow {
  sessionId: string;
  examRoundId?: string;
  examRoundTitle?: string;
  startedAt?: string;
  completedAt: string | null;
  itemsAdministered: number;
  cefrLevel: CefrLevel | null;
  theta: number | null;
  standardError: number | null;
  status?: SessionStatus;
  stoppingReason?: StoppingReason | null;
}

// ───────── Ngân hàng câu hỏi ─────────
export interface ItemRow {
  id: string;
  content: string;
  skill: Skill;
  cefrTarget: CefrTarget;
  topicTag?: string | null;
  status: ItemStatus;
  source: ItemBatchSource;
  irtB: number;
  updatedAt: string;
}

export interface ItemDetail extends ItemRow {
  options: Options;
  correctAnswer: OptionKey;
  explanation: RawExplanation;
  calibrated: boolean;
  timesUsed: number;
  approvedByName?: string | null;
  approvedAt?: string | null;
  /** Chưa chốt (O2, cần đổi schema): backend có thể không trả. */
  clonedFromId?: string | null;
}

export interface ItemInput {
  content: string;
  options: Options;
  correctAnswer: OptionKey;
  skill: Skill;
  cefrTarget: CefrTarget;
  topicTag?: string;
  irtB: number;
  explanation?: ExplanationContent | null;
}

export interface Paged<T> {
  data: T[];
  total: number;
}

export interface ItemFilters {
  skill?: Skill;
  cefr?: CefrTarget;
  status?: ItemStatus;
  source?: ItemBatchSource;
  q?: string;
  page?: number;
  limit?: number;
}

// ───────── Báo cáo ─────────
/** `GET /reports/class-distribution` — đúng dạng backend trả (ClassReportEntity). */
export interface ClassDistribution {
  examRoundId: string | null;
  totalStudents: number;
  /** Số sinh viên theo từng mức CEFR (đủ 6 khóa). */
  cefrDistribution: Record<CefrLevel, number>;
  averageTheta: number;
  generatedAt: string;
}

export interface ClassErrorPattern {
  topicTag: string;
  skill: Skill;
  studentCount: number;
  errorRate: number;
}

export type ExportType = "distribution" | "profiles";

// ───────── Tổng quan hệ thống cho Admin (F-29, S36; SRS 9b.19) ─────────
/** Một dòng bảng "Kỳ thi đang mở". `notStarted + inProgress + completed = participantCount`. */
export interface OpenRoundRow {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  participantCount: number;
  notStarted: number;
  inProgress: number;
  completed: number;
}

export interface SystemOverview {
  examRoundId: string | null;
  studentsCompleted: number;
  finalApprovedItems: number;
  batchesNeedingAction: number;
  openExamRounds: number;
  cefrDistribution: Record<CefrLevel, number>;
  itemStatusCounts: Record<ItemStatus, number>;
  openRounds: OpenRoundRow[];
  generatedAt: string;
}

// ───────── Quản lý tài khoản SV/GV của Admin (F-22, S24) ─────────
export type AccountKind = "STUDENT" | "TEACHER";

/** Phản hồi của backend; không bao giờ có mật khẩu hay mã băm. */
export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  /** STUDENT, TEACHER hoặc ADMIN (Admin nằm trong danh sách giảng viên để thu hồi quyền). */
  role: UserRole;
  /** MSSV; chỉ sinh viên có. */
  studentCode?: string;
  /** Mã giảng viên; GV và Admin có. */
  teacherCode?: string;
  isActive: boolean;
  /** `true` khi chưa đổi mật khẩu tạm (cột "Đã đổi mật khẩu: Chưa"). */
  mustChangePassword: boolean;
  createdAt: string;
}

/** Phân trang của backend cho danh sách tài khoản. */
export interface AccountPage {
  items: AdminAccount[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccountQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** Dữ liệu tạo mới: SV gửi `studentCode`, GV gửi `teacherCode`. */
export interface CreateAccountBody {
  studentCode?: string;
  teacherCode?: string;
  fullName: string;
  email: string;
}

export interface UpdateAccountBody {
  fullName?: string;
  email?: string;
}

export type AssignableRole = "ADMIN" | "TEACHER";

// ───────── Import tài khoản bằng file (S19, UCADM08) ─────────
/** Một dòng đã hợp lệ trong lưới tạm (Redis, chưa ghi DB). `code` là MSSV hoặc Mã GV theo loại. */
export interface ImportGridRow {
  rowKey: string;
  code: string;
  fullName: string;
  email: string;
}

export type ImportRejectCode = "MISSING_FIELD" | "INVALID_EMAIL" | "DUPLICATE_IN_FILE";

/** Dòng bị loại vì không hợp lệ; `row` là số dòng trong file Excel. */
export interface ImportRejectedRow {
  row: number;
  code: ImportRejectCode;
  reason: string;
}

/** Dòng trùng tài khoản đã có trong hệ thống (popup riêng, không vào lưới). */
export interface ImportExistingRow {
  row: number;
  field: "email" | "code";
  value: string;
}

export interface ImportUploadResult {
  grid: ImportGridRow[];
  rejected: ImportRejectedRow[];
  existing: ImportExistingRow[];
  added: number;
  ignoredDuplicates: number;
}

/** Trạng thái lần Lưu chạy nền; `NONE` khi chưa có hoặc đã hết hạn. Không chứa mật khẩu. */
export type ImportSaveStatus =
  | { status: "NONE" }
  | {
      status: "PROCESSING" | "DONE" | "FAILED";
      total: number;
      processed: number;
      created?: number;
      queued?: number;
      error?: { code: "CONFLICT" | "UNKNOWN"; message: string; conflicts?: ImportExistingRow[] };
    };

export interface StudentProfileView {
  student: { id?: string; studentCode: string; fullName: string; email?: string };
  latest: SessionResult | null;
  history: HistoryRow[];
}

// ───────── Kiểm duyệt câu hỏi cho Giảng viên (UCGV04, UCGV14, UCGV15 - S33, S11, S34, S35) ─────────
export interface ReviewOptionMap {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface OriginalSnapshot {
  content: string;
  options: ReviewOptionMap;
  correctAnswer: string;
  explanation: string;
}

export interface FirstReviewDetail {
  dueAt: string;
  action: string | null;
  reviewedAt: string | null;
  comment: string | null;
  originalSnapshot: OriginalSnapshot | null;
}

export interface SecondReviewDetail {
  dueAt: string;
  action: string | null;
  confirmedAt: string | null;
  comment: string | null;
}

export interface ItemFlag {
  level: string;
  reasonCodes: string[];
  suspectedDuplicateId?: string | null;
}

export interface ReviewItemDetail {
  id: string;
  content: string;
  options: ReviewOptionMap;
  correctAnswer: string;
  skill: string;
  cefrTarget: string;
  topicTag: string | null;
  irtB: number;
  status: string;
  explanation: string;
  firstReview: FirstReviewDetail | null;
  secondReview?: SecondReviewDetail | null;
  hasEdited: boolean;
  flags: ItemFlag[];
  reviewerName?: string;
}

export interface ReviewBatchSummary {
  batchId: string;
  batchName: string;
  totalAssigned: number;
  decidedCount: number;
  pendingCount: number;
  dueAt: string | null;
  isOverdue: boolean;
}

export interface ConfirmBatchSummary {
  batchId: string;
  batchName: string;
  totalAssigned: number;
  pendingCount: number;
  confirmedCount: number;
  removedCount: number;
  decidedCount: number;
  dueAt: string | null;
  isOverdue: boolean;
}

export interface TeacherTaskStats {
  pendingReviews: number;
  pendingConfirms: number;
}

export interface ReviewTasksResponse {
  batches: ReviewBatchSummary[];
  stats: TeacherTaskStats;
}

export interface ConfirmTasksResponse {
  batches: ConfirmBatchSummary[];
  stats: TeacherTaskStats;
}

export interface BatchReviewItemsResponse {
  batch: { id: string; name: string };
  items: ReviewItemDetail[];
}

export interface BatchConfirmItemsResponse {
  batch: { id: string; name: string };
  items: ReviewItemDetail[];
}

export interface EditItemInput {
  content?: string;
  options?: ReviewOptionMap;
  correctAnswer?: string;
  explanation?: string;
}

export type { SessionStatus };
