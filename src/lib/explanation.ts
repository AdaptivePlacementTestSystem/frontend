import type { ExplanationContent, OptionKey, RawExplanation } from "@/lib/api/types";

export interface ParsedExplanation {
  /** Giải thích chung (hoặc toàn bộ văn bản thô nếu là dữ liệu cũ). */
  general: string | null;
  options: Partial<Record<OptionKey, string>>;
}

const KEYS: readonly OptionKey[] = ["A", "B", "C", "D"];

function isContent(x: unknown): x is ExplanationContent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.general === "string" &&
    typeof o.options === "object" &&
    o.options !== null
  );
}

/**
 * Đọc giải thích AI (quyết định #78): JSON có phiên bản `{v:1, general, options}` nằm trong chuỗi;
 * dữ liệu cũ là chuỗi thường ⇒ trả nguyên văn ở `general`. `null`/rỗng ⇒ `null` (UI hiện "Câu này chưa có giải thích.").
 */
export function parseExplanation(raw: RawExplanation | undefined): ParsedExplanation | null {
  if (raw === null || raw === undefined) return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    if (text.startsWith("{")) {
      try {
        value = JSON.parse(text);
      } catch {
        return { general: text, options: {} };
      }
    } else {
      return { general: text, options: {} };
    }
  }
  if (isContent(value)) {
    const options: Partial<Record<OptionKey, string>> = {};
    for (const k of KEYS) {
      const v = (value.options as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim()) options[k] = v;
    }
    return { general: value.general || null, options };
  }
  // JSON lạ (sai phiên bản/hình dạng): không hiển thị JSON thô cho sinh viên
  return null;
}

/** Dựng chuỗi lưu vào `explanations.content` từ form giảng viên. */
export function serializeExplanation(content: ExplanationContent): string {
  return JSON.stringify(content);
}
