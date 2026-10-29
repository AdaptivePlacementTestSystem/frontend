import {
  CEFR_CONFIDENCES,
  CEFR_LEVELS,
  ITEM_BATCH_SOURCES,
  ITEM_STATUSES,
  SESSION_STATUSES,
  SKILLS,
  STOPPING_REASONS,
  USER_ROLES,
} from "@apt/shared-types";
import { vi } from "@/messages/vi";

const cases = [
  ["userRole", USER_ROLES],
  ["sessionStatus", SESSION_STATUSES],
  ["stoppingReason", STOPPING_REASONS],
  ["cefrLevel", CEFR_LEVELS],
  ["cefrConfidence", CEFR_CONFIDENCES],
  ["skill", SKILLS],
  ["itemStatus", ITEM_STATUSES],
  ["itemSource", ITEM_BATCH_SOURCES],
] as const;

describe("messages/vi — nhãn cho enum", () => {
  it.each(cases)("%s có nhãn không rỗng cho mọi giá trị enum", (key, values) => {
    const labels = vi[key] as Record<string, string>;
    for (const v of values) {
      expect(labels[v], `${key}.${v}`).toBeTruthy();
    }
    expect(Object.keys(labels).sort()).toEqual([...values].sort());
  });
});
