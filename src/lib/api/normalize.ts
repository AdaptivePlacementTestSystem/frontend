import { ApiError } from "./errors";
import type { ExamItem, NextItemResult, OptionKey, Options, ReviewEntry, SessionMeta, SessionResult } from "./types";
import { OPTION_KEYS } from "./types";
import {
  SKILLS,
  STOPPING_REASONS,
  type SkillValue as Skill,
  type StoppingReasonValue as StoppingReason,
} from "@apt/shared-types";

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => !!x && typeof x === "object" && !Array.isArray(x);

function pickOptions(x: unknown): Options {
  if (!isRec(x)) throw new ApiError(0, "UNKNOWN", "Câu hỏi thiếu các phương án.");
  const out = {} as Options;
  for (const k of OPTION_KEYS as readonly OptionKey[]) {
    const v = x[k];
    if (typeof v !== "string") throw new ApiError(0, "UNKNOWN", `Câu hỏi thiếu phương án ${k}.`);
    out[k] = v;
  }
  return out;
}

/**
 * Chỉ giữ ĐÚNG các trường được phép hiển thị khi thi. Mọi trường khác (cefrTarget, irtB, đáp án đúng,
 * isCorrect…) bị loại ở đây để không bao giờ lọt vào giao diện (SRS 15.3, UCSV03).
 */
export function toExamItem(raw: unknown): ExamItem {
  if (!isRec(raw) || typeof raw.id !== "string" || typeof raw.content !== "string") {
    throw new ApiError(0, "UNKNOWN", "Dữ liệu câu hỏi không hợp lệ.");
  }
  const skill = SKILLS.includes(raw.skill as Skill) ? (raw.skill as Skill) : "VOCABULARY";
  return { id: raw.id, content: raw.content, options: pickOptions(raw.options), skill };
}

function toSessionMeta(raw: unknown): SessionMeta {
  if (!isRec(raw)) {
    throw new ApiError(0, "UNKNOWN", "Thiếu thông tin phiên thi.");
  }
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    itemCount: typeof raw.itemCount === "number" ? raw.itemCount : 0,
    maxItems: typeof raw.maxItems === "number" ? raw.maxItems : 25,
    expiresAt:
      typeof raw.expiresAt === "string"
        ? raw.expiresAt
        : new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    serverTime:
      typeof raw.serverTime === "string"
        ? raw.serverTime
        : new Date().toISOString(),
  };
}

/**
 * Chuẩn hóa phản hồi `next-item` về hợp đồng đích (PX.9, PX.12):
 *  - `{kind:'item', session, item}`  — còn câu
 *  - `{kind:'finished', reason, sessionId}` — đã kết thúc
 * Dạng phẳng của backend (câu hỏi trần hoặc `{message}` khi hết câu) được hỗ trợ tương thích ngược.
 */
export function normalizeNextItem(raw: unknown): NextItemResult {
  if (isRec(raw) && raw.kind === "finished") {
    const reason = STOPPING_REASONS.includes(raw.reason as StoppingReason)
      ? (raw.reason as StoppingReason)
      : "SE_THRESHOLD";
    if (typeof raw.sessionId !== "string") throw new ApiError(0, "UNKNOWN", "Thiếu mã phiên.");
    return { kind: "finished", reason, sessionId: raw.sessionId };
  }
  if (isRec(raw) && raw.kind === "item") {
    return { kind: "item", session: toSessionMeta(raw.session), item: toExamItem(raw.item) };
  }
  // Fallback tương thích ngược: Backend trả về bare item trực tiếp
  if (isRec(raw) && typeof raw.id === "string" && typeof raw.content === "string") {
    const rawSession = isRec(raw.session) ? raw.session : {};
    return {
      kind: "item",
      session: {
        id: typeof rawSession.id === "string" ? rawSession.id : "",
        itemCount: typeof rawSession.itemCount === "number" ? rawSession.itemCount : 0,
        maxItems: typeof rawSession.maxItems === "number" ? rawSession.maxItems : 25,
        expiresAt:
          typeof rawSession.expiresAt === "string"
            ? rawSession.expiresAt
            : new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        serverTime:
          typeof rawSession.serverTime === "string"
            ? rawSession.serverTime
            : new Date().toISOString(),
      },
      item: toExamItem(raw),
    };
  }
  if (isRec(raw) && typeof raw.message === "string" && raw.id === undefined) {
    throw new ApiError(409, "NO_ITEMS_AVAILABLE", raw.message);
  }
  throw new ApiError(0, "UNKNOWN", "Phản hồi next-item chưa khớp hợp đồng (thiếu session/kind).");
}

/**
 * Chuẩn hóa kết quả bài thi từ backend về SessionResult:
 * Backend trả về cấu trúc phẳng (thetaFinal, seFinal, totalItems, stoppingReason...)
 * Hàm này chuẩn hóa sang { ability, meta, skillProfiles, ... } để UI ResultCard và ResultView luôn an toàn.
 */
export function normalizeSessionResult(raw: unknown): SessionResult {
  if (!isRec(raw)) {
    throw new ApiError(0, "UNKNOWN", "Dữ liệu kết quả không hợp lệ.");
  }

  const abilityRaw = isRec(raw.ability) ? raw.ability : {};
  const metaRaw = isRec(raw.meta) ? raw.meta : {};

  const theta =
    typeof abilityRaw.theta === "number"
      ? abilityRaw.theta
      : typeof raw.thetaFinal === "number"
        ? raw.thetaFinal
        : typeof raw.theta === "number"
          ? raw.theta
          : 0;

  const standardError =
    typeof abilityRaw.standardError === "number"
      ? abilityRaw.standardError
      : typeof raw.seFinal === "number"
        ? raw.seFinal
        : typeof raw.standardError === "number"
          ? raw.standardError
          : 0.35;

  const ci95 =
    Array.isArray(abilityRaw.ci95) && abilityRaw.ci95.length === 2
      ? (abilityRaw.ci95 as [number, number])
      : Array.isArray(raw.confidenceInterval95) && raw.confidenceInterval95.length === 2
        ? (raw.confidenceInterval95 as [number, number])
        : [
            parseFloat((theta - 1.96 * standardError).toFixed(4)),
            parseFloat((theta + 1.96 * standardError).toFixed(4)),
          ];

  const itemsAdministered =
    typeof metaRaw.itemsAdministered === "number"
      ? metaRaw.itemsAdministered
      : typeof raw.totalItems === "number"
        ? raw.totalItems
        : typeof raw.itemsAdministered === "number"
          ? raw.itemsAdministered
          : 0;

  const durationSeconds =
    typeof metaRaw.durationSeconds === "number"
      ? metaRaw.durationSeconds
      : typeof raw.durationSeconds === "number"
        ? raw.durationSeconds
        : 0;

  const stoppingReason =
    (metaRaw.stoppingReason as StoppingReason) ??
    (raw.stoppingReason as StoppingReason) ??
    "SE_REACHED";

  const cefrConfidence =
    (raw.cefrConfidence as any) ??
    (raw.confidenceLevel as any) ??
    "HIGH";

  const rawSkillProfiles = Array.isArray(raw.skillProfiles) ? (raw.skillProfiles as any[]) : [];
  const skillProfiles = rawSkillProfiles.map((s) => ({
    skill: (s.skill as Skill) ?? "VOCABULARY",
    itemsAdministered:
      typeof s.itemsAdministered === "number"
        ? s.itemsAdministered
        : typeof s.questionsCount === "number"
          ? s.questionsCount
          : typeof s.total === "number"
            ? s.total
            : 0,
    correctCount: typeof s.correctCount === "number" ? s.correctCount : 0,
    scorePercent: typeof s.scorePercent === "number" ? s.scorePercent : undefined,
    accuracyRate: typeof s.accuracyRate === "number" ? s.accuracyRate : undefined,
  }));

  const rawErrorPatterns = Array.isArray(raw.errorPatterns) ? (raw.errorPatterns as any[]) : [];
  const errorPatterns = rawErrorPatterns.map((e, index) => {
    const topicTag = String(e.topicTag ?? e.topic ?? `Chủ điểm ${index + 1}`);
    const skill = (e.skill as Skill) ?? "GRAMMAR";
    const itemsAttempted =
      typeof e.itemsAttempted === "number"
        ? e.itemsAttempted
        : typeof e.total === "number"
          ? e.total
          : typeof e.count === "number"
            ? e.count + (e.correctCount ?? 0)
            : 1;
    const correctCount = typeof e.correctCount === "number" ? e.correctCount : 0;
    const accuracyRate =
      typeof e.accuracyRate === "number"
        ? e.accuracyRate
        : itemsAttempted > 0
          ? parseFloat((correctCount / itemsAttempted).toFixed(2))
          : 0;
    const severity =
      e.severity ?? (accuracyRate < 0.4 ? "HIGH" : accuracyRate < 0.7 ? "MEDIUM" : "LOW");

    return {
      topicTag,
      skill,
      itemsAttempted,
      correctCount,
      accuracyRate,
      severity,
    };
  });

  return {
    sessionId: String(raw.sessionId ?? raw.id ?? ""),
    completedAt: String(raw.completedAt ?? new Date().toISOString()),
    cefrLevel: (raw.cefrLevel as any) ?? "B1",
    cefrConfidence,
    boundaryEffect: Boolean(raw.boundaryEffect),
    ability: {
      theta,
      standardError,
      ci95: ci95 as [number, number],
    },
    skillProfiles,
    errorPatterns,
    aiRecommendations: Array.isArray(raw.aiRecommendations) ? raw.aiRecommendations : [],
    meta: {
      itemsAdministered,
      durationSeconds,
      stoppingReason,
    },
  };
}

/**
 * Normalize review response từ backend về ReviewEntry[].
 * Backend thật trả: questionNumber, selectedAnswer, correctAnswer, options (flat)
 * Frontend expect: order, chosen, correct, options (Record<A|B|C|D, string>)
 */
export function normalizeReview(raw: unknown): ReviewEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: any, idx: number) => {
    // Map field names: backend có thể trả questionNumber hoặc order
    const order: number =
      typeof entry.order === "number"
        ? entry.order
        : typeof entry.questionNumber === "number"
          ? entry.questionNumber
          : idx + 1;

    const content: string = String(entry.content ?? "");

    // Normalize options: có thể là Record<A,B,C,D> hoặc plain object
    const rawOptions = entry.options ?? {};
    const options: Options = {
      A: String(rawOptions.A ?? rawOptions.a ?? ""),
      B: String(rawOptions.B ?? rawOptions.b ?? ""),
      C: String(rawOptions.C ?? rawOptions.c ?? ""),
      D: String(rawOptions.D ?? rawOptions.d ?? ""),
    };

    // chosen: backend có thể trả selectedAnswer hoặc chosen
    const chosenRaw = entry.chosen ?? entry.selectedAnswer ?? entry.selected ?? "A";
    const chosen: OptionKey = (OPTION_KEYS as readonly string[]).includes(chosenRaw)
      ? (chosenRaw as OptionKey)
      : "A";

    // correct: backend có thể trả correctAnswer hoặc correct
    const correctRaw = entry.correct ?? entry.correctAnswer ?? entry.answer ?? "A";
    const correct: OptionKey = (OPTION_KEYS as readonly string[]).includes(correctRaw)
      ? (correctRaw as OptionKey)
      : "A";

    const isCorrect: boolean =
      typeof entry.isCorrect === "boolean" ? entry.isCorrect : chosen === correct;

    const skill = SKILLS.includes(entry.skill as Skill) ? (entry.skill as Skill) : undefined;

    return {
      order,
      content,
      options,
      chosen,
      correct,
      isCorrect,
      skill,
      explanation: entry.explanation ?? null,
    };
  });
}
