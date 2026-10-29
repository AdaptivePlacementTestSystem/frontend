import { ApiError } from "./errors";
import type { ExamItem, NextItemResult, OptionKey, Options, SessionMeta } from "./types";
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
  if (
    !isRec(raw) ||
    typeof raw.id !== "string" ||
    typeof raw.expiresAt !== "string" ||
    typeof raw.serverTime !== "string"
  ) {
    throw new ApiError(0, "UNKNOWN", "Thiếu thông tin phiên thi (hạn và giờ máy chủ).");
  }
  return {
    id: raw.id,
    itemCount: typeof raw.itemCount === "number" ? raw.itemCount : 0,
    maxItems: typeof raw.maxItems === "number" ? raw.maxItems : 0,
    expiresAt: raw.expiresAt,
    serverTime: raw.serverTime,
  };
}

/**
 * Chuẩn hóa phản hồi `next-item` về hợp đồng đích (PX.9, PX.12):
 *  - `{kind:'item', session, item}`  — còn câu
 *  - `{kind:'finished', reason, sessionId}` — đã kết thúc
 * Dạng hiện tại của backend (câu hỏi trần hoặc `{message}` khi hết câu) KHÔNG đủ thông tin ⇒ báo lỗi rõ ràng
 * thay vì hiển thị đồng hồ giả.
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
  if (isRec(raw) && typeof raw.message === "string" && raw.id === undefined) {
    throw new ApiError(409, "NO_ITEMS_AVAILABLE", raw.message);
  }
  throw new ApiError(0, "UNKNOWN", "Phản hồi next-item chưa khớp hợp đồng (thiếu session/kind).");
}
