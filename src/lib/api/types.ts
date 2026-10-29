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
  scorePercent: number;
  cefrEstimate: CefrLevel;
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
  completedAt: string;
  cefrLevel: CefrLevel;
  cefrConfidence: CefrConfidence;
  boundaryEffect: boolean;
  ability: { theta: number; standardError: number; ci95: [number, number] };
  skillProfiles: SkillProfile[];
  errorPatterns: ErrorPattern[];
  aiRecommendations: string[];
  meta: { itemsAdministered: number; durationSeconds: number; stoppingReason: StoppingReason };
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
  completedAt: string;
  itemsAdministered: number;
  cefrLevel: CefrLevel;
  theta: number;
  standardError: number;
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
export interface ClassDistribution {
  total: number;
  distribution: { cefrLevel: CefrLevel; count: number }[];
  /** Chỉ Admin (UCADM05). */
  itemsByStatus?: { status: ItemStatus; count: number }[];
}

export interface ClassErrorPattern {
  topicTag: string;
  skill: Skill;
  studentCount: number;
  errorRate: number;
}

export type ExportType = "distribution" | "profiles";

export interface StudentProfileView {
  student: { studentCode: string; fullName: string };
  latest: SessionResult | null;
  history: HistoryRow[];
}

export type { SessionStatus };
