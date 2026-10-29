/**
 * BACKEND GIẢ (MOCK) — chỉ để phát triển/test giao diện khi backend chưa xong. Dữ liệu mẫu là TỰ SOẠN, không lấy
 * từ bộ câu hỏi thật (CLOTH chưa rõ giấy phép, repo công khai). Không dùng ở môi trường thật.
 */
import type {
  CefrTarget,
  ClassDistribution,
  ClassErrorPattern,
  CurrentUser,
  ExplanationContent,
  HistoryRow,
  ItemDetail,
  OptionKey,
  Options,
  ReviewEntry,
  SessionResult,
} from "@/lib/api/types";
import {
  type CefrLevelValue as CefrLevel,
  type ItemBatchSourceValue as ItemBatchSource,
  type ItemStatusValue as ItemStatus,
  type SkillValue as Skill,
} from "@apt/shared-types";

export const MOCK_PASSWORD = "password123";
export const MOCK_MAX_ITEMS = Number(process.env.MOCK_MAX_ITEMS ?? 6);
export const MOCK_DISPLAY_MAX_ITEMS = 25;
export const MOCK_SESSION_MINUTES = 45;
export const MOCK_GRACE_SECONDS = 60;
/** Ngưỡng #77: từ đây trở lên khi hết hạn ⇒ COMPLETED + TIMEOUT; dưới ⇒ ABANDONED. */
export const MOCK_TIMEOUT_COMPLETE_MIN_ITEMS = 8;

export interface MockUser extends CurrentUser {
  password: string;
  locked?: boolean;
}

export const USERS: MockUser[] = [
  {
    id: "u-sv1",
    email: "sv001@example.test",
    fullName: "Nguyễn Văn An (mock)",
    role: "STUDENT",
    studentCode: "SV2026001",
    password: MOCK_PASSWORD,
  },
  {
    id: "u-sv2",
    email: "sv002@example.test",
    fullName: "Lê Thị Cúc (mock)",
    role: "STUDENT",
    studentCode: "SV2026002",
    password: MOCK_PASSWORD,
  },
  {
    id: "u-gv1",
    email: "gv001@example.test",
    fullName: "Trần Thị Bình (mock)",
    role: "TEACHER",
    studentCode: null,
    password: MOCK_PASSWORD,
  },
  {
    id: "u-ad1",
    email: "admin@example.test",
    fullName: "Quản trị (mock)",
    role: "ADMIN",
    studentCode: null,
    password: MOCK_PASSWORD,
  },
  {
    id: "u-lock",
    email: "locked@example.test",
    fullName: "Bị khóa (mock)",
    role: "STUDENT",
    studentCode: "SV2026999",
    password: MOCK_PASSWORD,
    locked: true,
  },
];

// ───────── Ngân hàng câu hỏi mẫu ─────────
interface MockItem extends Omit<ItemDetail, "explanation"> {
  explanation: ItemDetail["explanation"];
}

const opts = (a: string, b: string, c: string, d: string): Options => ({ A: a, B: b, C: c, D: d });
const exp = (general: string, o: Partial<Record<OptionKey, string>>): ExplanationContent => ({
  v: 1,
  general,
  options: o,
});
const NOW = "2026-10-01T08:00:00+07:00";

function mk(
  n: number,
  p: Partial<MockItem> &
    Pick<MockItem, "content" | "options" | "correctAnswer" | "skill" | "cefrTarget" | "status">,
): MockItem {
  return {
    id: `mock-i-${n}`,
    topicTag: null,
    source: "IMPORTED" as ItemBatchSource,
    irtB: 0,
    updatedAt: NOW,
    explanation: null,
    calibrated: false,
    timesUsed: 0,
    approvedByName: null,
    approvedAt: null,
    clonedFromId: null,
    ...p,
  };
}

export function seedItems(): MockItem[] {
  const base: Omit<Parameters<typeof mk>[1], "status">[] = [
    {
      content: "She ____ to school every day.",
      options: opts("go", "goes", "going", "gone"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "A1",
      topicTag: "present_simple",
      irtB: -2.1,
      explanation: exp("Chủ ngữ số ít ở hiện tại đơn dùng động từ thêm -s/-es.", {
        A: "'go' dùng với I/you/we/they.",
        B: "'goes' đúng với 'She'.",
        C: "'going' cần trợ động từ.",
        D: "'gone' là quá khứ phân từ.",
      }),
    },
    {
      content: "A place where you borrow books is a ____.",
      options: opts("bakery", "library", "garage", "stadium"),
      correctAnswer: "B",
      skill: "VOCABULARY",
      cefrTarget: "A1",
      topicTag: "places",
      irtB: -2.0,
      explanation: "Thư viện (library) là nơi mượn sách.",
    },
    {
      content: "I ____ my homework yesterday.",
      options: opts("do", "did", "done", "doing"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "A2",
      topicTag: "past_simple",
      irtB: -1.4,
      explanation: exp("Có 'yesterday' nên dùng quá khứ đơn.", {
        B: "'did' là quá khứ đơn của 'do'.",
      }),
    },
    {
      content: "He is ____ than his brother.",
      options: opts("tall", "taller", "tallest", "more tall"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "A2",
      topicTag: "comparatives",
      irtB: -1.2,
      explanation: null,
    },
    {
      content: "The opposite of 'expensive' is ____.",
      options: opts("cheap", "heavy", "narrow", "quiet"),
      correctAnswer: "A",
      skill: "VOCABULARY",
      cefrTarget: "A2",
      topicTag: "adjectives",
      irtB: -1.1,
    },
    {
      content: "If it rains, we ____ at home.",
      options: opts("stay", "will stay", "stayed", "would stay"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "B1",
      topicTag: "first_conditional",
      irtB: -0.3,
      explanation: exp("Câu điều kiện loại 1: If + hiện tại đơn, will + động từ.", {
        B: "'will stay' đúng cấu trúc loại 1.",
      }),
    },
    {
      content: "She has lived here ____ 2015.",
      options: opts("for", "since", "during", "from"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "B1",
      topicTag: "present_perfect",
      irtB: 0.0,
      explanation: "Dùng 'since' với mốc thời gian.",
    },
    {
      content: "To 'postpone' a meeting means to ____ it.",
      options: opts("cancel", "delay", "attend", "record"),
      correctAnswer: "B",
      skill: "VOCABULARY",
      cefrTarget: "B1",
      topicTag: "verbs",
      irtB: 0.2,
    },
    {
      content: "The report was written ____ the committee.",
      options: opts("by", "with", "from", "at"),
      correctAnswer: "A",
      skill: "GRAMMAR",
      cefrTarget: "B1",
      topicTag: "passive_voice",
      irtB: 0.4,
      explanation: exp("Bị động dùng 'by' chỉ tác nhân.", { A: "'by' đúng." }),
    },
    {
      content: "Her argument was ____, so nobody disagreed.",
      options: opts("convincing", "convinced", "convince", "convincingly"),
      correctAnswer: "A",
      skill: "VOCABULARY",
      cefrTarget: "B2",
      topicTag: "word_forms",
      irtB: 1.0,
    },
    {
      content: "Had I known, I ____ you.",
      options: opts("would tell", "would have told", "will tell", "told"),
      correctAnswer: "B",
      skill: "GRAMMAR",
      cefrTarget: "B2",
      topicTag: "third_conditional",
      irtB: 1.2,
      explanation: null,
    },
    {
      content: "The phrase 'in the long run' means ____.",
      options: opts("eventually", "immediately", "rarely", "suddenly"),
      correctAnswer: "A",
      skill: "VOCABULARY",
      cefrTarget: "B2",
      topicTag: "idioms",
      irtB: 1.3,
    },
  ];
  const statuses: ItemStatus[] = [
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
    "FINAL_APPROVED",
  ];
  const items = base.map((b, i) =>
    mk(i + 1, {
      ...b,
      status: statuses[i] as ItemStatus,
      timesUsed: 10 + i,
      calibrated: true,
      approvedByName: "Trần Thị Bình (mock)",
      approvedAt: NOW,
    }),
  );
  const extra: MockItem[] = [];
  const extraDefs: [ItemStatus, Skill, CefrTarget, ItemBatchSource, string][] = [
    ["DRAFT", "GRAMMAR", "A2", "IMPORTED", "My sister ____ a book now."],
    ["DRAFT", "VOCABULARY", "B1", "AI_GENERATED", "Choose the best synonym for 'rapid'."],
    ["FIRST_APPROVED", "GRAMMAR", "B1", "AI_GENERATED", "They ____ dinner when the phone rang."],
    [
      "FIRST_APPROVED",
      "VOCABULARY",
      "A2",
      "IMPORTED",
      "A person who cooks in a restaurant is a ____.",
    ],
    [
      "SECOND_APPROVED",
      "GRAMMAR",
      "B2",
      "IMPORTED",
      "No sooner ____ he arrived than it began to rain.",
    ],
    ["REJECTED", "VOCABULARY", "A1", "AI_GENERATED", "The color of the sky is ____."],
    ["REJECTED", "GRAMMAR", "B1", "IMPORTED", "I am agree with you."],
    ["FINAL_APPROVED", "VOCABULARY", "B1", "IMPORTED", "Which word means 'very tired'?"],
  ];
  extraDefs.forEach(([status, skill, cefr, source, content], i) => {
    extra.push(
      mk(100 + i, {
        content,
        options: opts("option A", "option B", "option C", "option D"),
        correctAnswer: "A",
        skill,
        cefrTarget: cefr,
        status,
        source,
        topicTag: "mock_topic",
        irtB: -0.5 + i * 0.2,
        timesUsed: status === "FINAL_APPROVED" ? 4 : 0,
        calibrated: status === "FINAL_APPROVED",
      }),
    );
  });
  return [...items, ...extra];
}

// ───────── Phiên thi ─────────
export interface MockSession {
  id: string;
  studentId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  startedAt: number;
  expiresAt: number;
  currentItemId: string | null;
  answers: { itemId: string; chosen: OptionKey }[];
  stoppingReason?: "SE_THRESHOLD" | "TIMEOUT" | "MAX_ITEMS_REACHED";
  completedAt?: number;
}

export interface MockDb {
  items: MockItem[];
  sessions: MockSession[];
  seq: number;
  now: () => number;
  reviewEnabled: boolean;
}

export function createDb(now: () => number = Date.now): MockDb {
  return {
    items: seedItems(),
    sessions: [],
    seq: 1000,
    now,
    reviewEnabled: process.env.MOCK_REVIEW_ENABLED !== "false",
  };
}

export function nextId(db: MockDb, prefix: string): string {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}

const examBank = (db: MockDb) => db.items.filter((i) => i.status === "FINAL_APPROVED").slice(0, 12);

export function startSession(db: MockDb, studentId: string): MockSession {
  const t = db.now();
  const s: MockSession = {
    id: nextId(db, "mock-s"),
    studentId,
    status: "IN_PROGRESS",
    startedAt: t,
    expiresAt: t + MOCK_SESSION_MINUTES * 60_000,
    currentItemId: null,
    answers: [],
  };
  db.sessions.push(s);
  return s;
}

export const activeSessionOf = (db: MockDb, studentId: string) =>
  db.sessions.find((s) => s.studentId === studentId && s.status === "IN_PROGRESS");

/** Dọn lười phiên quá hạn (#77): ≥ 8 câu ⇒ COMPLETED+TIMEOUT; ít hơn ⇒ ABANDONED. Trả về phiên vừa đóng (nếu có). */
export function lazyClose(db: MockDb, studentId: string): MockSession | null {
  const s = activeSessionOf(db, studentId);
  if (!s) return null;
  if (db.now() <= s.expiresAt + MOCK_GRACE_SECONDS * 1000) return null;
  if (s.answers.length >= MOCK_TIMEOUT_COMPLETE_MIN_ITEMS) {
    s.status = "COMPLETED";
    s.stoppingReason = "TIMEOUT";
    s.completedAt = s.expiresAt;
  } else {
    s.status = "ABANDONED";
  }
  s.currentItemId = null;
  return s;
}

/** Chọn câu kế tiếp (mock đơn giản: lần lượt theo ngân hàng, không phải thuật toán CAT). */
export function pickNext(db: MockDb, s: MockSession) {
  if (s.currentItemId) return db.items.find((i) => i.id === s.currentItemId) ?? null;
  const used = new Set(s.answers.map((a) => a.itemId));
  const item = examBank(db).find((i) => !used.has(i.id));
  if (item) s.currentItemId = item.id;
  return item ?? null;
}

export function submitAnswer(
  db: MockDb,
  s: MockSession,
  itemId: string,
  chosen: OptionKey,
): { shouldStop: boolean } {
  s.answers.push({ itemId, chosen });
  s.currentItemId = null;
  const shouldStop = s.answers.length >= MOCK_MAX_ITEMS;
  if (shouldStop) {
    s.status = "COMPLETED";
    s.stoppingReason = "SE_THRESHOLD";
    s.completedAt = db.now();
  }
  return { shouldStop };
}

const cefrFromRatio = (r: number): CefrLevel =>
  r >= 0.85 ? "B2" : r >= 0.6 ? "B1" : r >= 0.35 ? "A2" : "A1";

export function buildResult(db: MockDb, s: MockSession): SessionResult {
  const graded = s.answers.map((a) => {
    const it = db.items.find((i) => i.id === a.itemId)!;
    return { it, ok: it.correctAnswer === a.chosen };
  });
  const ratio = graded.length ? graded.filter((g) => g.ok).length / graded.length : 0;
  const theta = Number(((ratio - 0.5) * 4).toFixed(2));
  const se = 0.31;
  const bySkill = (skill: Skill) => {
    const g = graded.filter((x) => x.it.skill === skill);
    const c = g.filter((x) => x.ok).length;
    const r = g.length ? c / g.length : 0;
    return {
      skill,
      scorePercent: Math.round(r * 100),
      cefrEstimate: cefrFromRatio(r),
      itemsAdministered: g.length,
      correctCount: c,
    };
  };
  const wrong = graded.filter((g) => !g.ok);
  return {
    sessionId: s.id,
    completedAt: new Date(s.completedAt ?? db.now()).toISOString(),
    cefrLevel: cefrFromRatio(ratio),
    cefrConfidence: "MEDIUM",
    boundaryEffect: false,
    ability: {
      theta,
      standardError: se,
      ci95: [Number((theta - 1.96 * se).toFixed(2)), Number((theta + 1.96 * se).toFixed(2))],
    },
    skillProfiles: [bySkill("VOCABULARY"), bySkill("GRAMMAR")],
    errorPatterns: wrong.map((w) => ({
      topicTag: w.it.topicTag ?? "unknown",
      skill: w.it.skill,
      itemsAttempted: 1,
      correctCount: 0,
      accuracyRate: 0,
      severity: "HIGH" as const,
    })),
    aiRecommendations: [
      "(mock) Ưu tiên ôn các chủ đề bạn làm sai.",
      "(mock) Luyện thêm từ vựng theo chủ đề.",
    ],
    meta: {
      itemsAdministered: s.answers.length,
      durationSeconds: Math.round(((s.completedAt ?? db.now()) - s.startedAt) / 1000),
      stoppingReason: s.stoppingReason === "TIMEOUT" ? "TIMEOUT" : "SE_THRESHOLD",
    },
  };
}

export function buildReview(db: MockDb, s: MockSession): ReviewEntry[] {
  return s.answers.map((a, i) => {
    const it = db.items.find((x) => x.id === a.itemId)!;
    return {
      order: i + 1,
      content: it.content,
      options: it.options,
      chosen: a.chosen,
      correct: it.correctAnswer,
      isCorrect: a.chosen === it.correctAnswer,
      skill: it.skill,
      // Giải thích lưu trong cột content dạng JSON chuỗi (#78); một số câu là văn bản thô cũ hoặc null
      explanation:
        typeof it.explanation === "object" && it.explanation !== null
          ? JSON.stringify(it.explanation)
          : it.explanation,
    };
  });
}

export function historyFor(db: MockDb, studentId: string): HistoryRow[] {
  return db.sessions
    .filter((s) => s.studentId === studentId && s.status === "COMPLETED")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .map((s) => {
      const r = buildResult(db, s);
      return {
        sessionId: s.id,
        completedAt: r.completedAt,
        itemsAdministered: r.meta.itemsAdministered,
        cefrLevel: r.cefrLevel,
        theta: r.ability.theta,
        standardError: r.ability.standardError,
      };
    });
}

// ───────── Báo cáo mẫu ─────────
export function mockDistribution(isAdmin: boolean, db: MockDb): ClassDistribution {
  const levels: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1_PLUS"];
  const counts = [1, 6, 14, 11, 4, 0];
  const out: ClassDistribution = {
    total: counts.reduce((a, b) => a + b, 0),
    distribution: levels.map((cefrLevel, i) => ({ cefrLevel, count: counts[i] ?? 0 })),
  };
  if (isAdmin) {
    const statuses: ItemStatus[] = [
      "DRAFT",
      "FIRST_APPROVED",
      "SECOND_APPROVED",
      "FINAL_APPROVED",
      "REJECTED",
      "AI_REJECTED",
    ];
    out.itemsByStatus = statuses.map((status) => ({
      status,
      count: db.items.filter((i) => i.status === status).length,
    }));
  }
  return out;
}

export const MOCK_ERROR_PATTERNS: ClassErrorPattern[] = [
  { topicTag: "past_simple", skill: "GRAMMAR", studentCount: 22, errorRate: 0.58 },
  { topicTag: "present_perfect", skill: "GRAMMAR", studentCount: 18, errorRate: 0.47 },
  { topicTag: "word_forms", skill: "VOCABULARY", studentCount: 15, errorRate: 0.41 },
];

export function toCsv(rows: (string | number)[][]): string {
  return (
    "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n")
  );
}
