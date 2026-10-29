import { http, HttpResponse, type HttpHandler } from "msw";
import { decodeJwtClaims } from "@/lib/auth/jwt";
import type { CurrentUser, ItemDetail, OptionKey, StudentProfileView } from "@/lib/api/types";
import { OPTION_KEYS } from "@/lib/api/types";
import { ITEM_STATUSES } from "@apt/shared-types";
import {
  MOCK_DISPLAY_MAX_ITEMS,
  MOCK_ERROR_PATTERNS,
  MOCK_PASSWORD,
  USERS,
  activeSessionOf,
  buildResult,
  buildReview,
  createDb,
  historyFor,
  lazyClose,
  mockDistribution,
  pickNext,
  startSession,
  submitAnswer,
  toCsv,
  type MockDb,
  type MockSession,
  type MockUser,
} from "./db";

const API = (process.env.API_BASE_URL ?? "http://localhost:3001/api/v1").replace(/\/$/, "");

type Req = { request: Request; params: Record<string, string | readonly string[] | undefined> };

const err = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ code, message, details }, { status });

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

/** JWT giả (không ký thật) để proxy.ts/giao diện đọc được vai trò và hạn. */
export function makeMockToken(u: MockUser, nowMs: number = Date.now()): string {
  const payload = {
    sub: u.id,
    role: u.role,
    email: u.email,
    exp: Math.floor(nowMs / 1000) + 3600,
  };
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.mock`;
}

const publicUser = (u: MockUser): CurrentUser => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  studentCode: u.studentCode,
});

function authUser(request: Request): MockUser | null {
  const h = request.headers.get("authorization") ?? "";
  const claims = decodeJwtClaims(h.startsWith("Bearer ") ? h.slice(7) : "");
  if (!claims?.sub) return null;
  return USERS.find((u) => u.id === claims.sub) ?? null;
}

const toDetail = (it: MockDb["items"][number]): ItemDetail => {
  return it;
};

const isStaffUser = (u: MockUser) => u.role === "TEACHER" || u.role === "ADMIN";

/** Tạo bộ handler dùng chung cho Vitest (setupServer) và `next dev` chế độ giả (instrumentation). */
export function createHandlers(db: MockDb): HttpHandler[] {
  const own = (u: MockUser, id: string): MockSession | "forbidden" | null => {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) return null;
    return s.studentId === u.id ? s : "forbidden";
  };
  const sessionMeta = (s: MockSession) => ({
    id: s.id,
    itemCount: s.answers.length,
    maxItems: MOCK_DISPLAY_MAX_ITEMS,
    expiresAt: new Date(s.expiresAt).toISOString(),
    serverTime: new Date(db.now()).toISOString(),
  });
  const examPayload = (s: MockSession) => {
    if (s.status !== "IN_PROGRESS")
      return { kind: "finished", reason: s.stoppingReason ?? "SE_THRESHOLD", sessionId: s.id };
    const it = pickNext(db, s);
    if (!it) return { kind: "finished", reason: "ITEM_BANK_BOUNDARY", sessionId: s.id };
    // Chỉ trả các trường được phép; cố ý KHÔNG có đáp án đúng, cefrTarget, irtB
    return {
      kind: "item",
      session: sessionMeta(s),
      item: { id: it.id, content: it.content, options: it.options, skill: it.skill },
    };
  };

  return [
    // ───────── Xác thực ─────────
    http.post(`${API}/auth/login`, async ({ request }: Req) => {
      const b = (await request.json().catch(() => null)) as {
        email?: string;
        password?: string;
      } | null;
      const u = USERS.find((x) => x.email === b?.email || x.studentCode === b?.email);
      if (!u || b?.password !== MOCK_PASSWORD)
        return err(401, "INVALID_CREDENTIALS", "Sai thông tin đăng nhập");
      if (u.locked) return err(403, "ACCOUNT_LOCKED", "Tài khoản bị khóa");
      return HttpResponse.json({ accessToken: makeMockToken(u, db.now()), user: publicUser(u) });
    }),
    http.get(`${API}/auth/me`, ({ request }: Req) => {
      const u = authUser(request);
      return u ? HttpResponse.json(publicUser(u)) : err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
    }),

    // ───────── Phiên thi ─────────
    http.post(`${API}/sessions`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (u.role !== "STUDENT") return err(403, "FORBIDDEN", "Chỉ sinh viên được làm bài");
      lazyClose(db, u.id);
      const active = activeSessionOf(db, u.id);
      if (active)
        return err(409, "SESSION_IN_PROGRESS", "Bạn đang có một bài thi chưa hoàn thành.", {
          sessionId: active.id,
        });
      return HttpResponse.json({ sessionId: startSession(db, u.id).id }, { status: 201 });
    }),
    http.get(`${API}/sessions/active`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const closed = lazyClose(db, u.id);
      const s = activeSessionOf(db, u.id);
      const meta = s ? sessionMeta(s) : null;
      return HttpResponse.json({
        session:
          s && meta
            ? {
                sessionId: s.id,
                itemCount: meta.itemCount,
                maxItems: meta.maxItems,
                expiresAt: meta.expiresAt,
                serverTime: meta.serverTime,
              }
            : null,
        closedPrevious: closed ? { sessionId: closed.id, status: closed.status } : null,
      });
    }),
    http.get(`${API}/sessions/:id/next-item`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const s = own(u, String(params.id));
      if (s === null) return err(404, "NOT_FOUND", "Không tìm thấy phiên");
      if (s === "forbidden") return err(403, "FORBIDDEN", "Không có quyền");
      return HttpResponse.json(examPayload(s));
    }),
    http.get(`${API}/sessions/:id/resume`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const s = own(u, String(params.id));
      if (s === null) return err(404, "NOT_FOUND", "Không tìm thấy phiên");
      if (s === "forbidden") return err(403, "FORBIDDEN", "Không có quyền");
      return HttpResponse.json(examPayload(s));
    }),
    http.post(`${API}/sessions/:id/responses`, async ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const s = own(u, String(params.id));
      if (s === null) return err(404, "NOT_FOUND", "Không tìm thấy phiên");
      if (s === "forbidden") return err(403, "FORBIDDEN", "Không có quyền");
      const b = (await request.json().catch(() => null)) as {
        itemId?: string;
        response?: OptionKey;
      } | null;
      if (s.status !== "IN_PROGRESS") return err(409, "SESSION_EXPIRED", "Phiên đã kết thúc");
      if (!b?.itemId || !b.response || !OPTION_KEYS.includes(b.response))
        return err(400, "VALIDATION_FAILED", "Dữ liệu không hợp lệ");
      if (b.itemId !== s.currentItemId)
        return err(409, "SESSION_ITEM_MISMATCH", "Câu hỏi nộp không khớp câu hiện tại");
      const { shouldStop } = submitAnswer(db, s, b.itemId, b.response);
      // Không trả isCorrect/θ/SE (PX.14, #59)
      return HttpResponse.json({ accepted: true, shouldStop });
    }),
    http.get(`${API}/sessions/:id/result`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const s = own(u, String(params.id));
      if (s === null) return err(404, "NOT_FOUND", "Không tìm thấy phiên");
      if (s === "forbidden") return err(403, "FORBIDDEN", "Không có quyền");
      if (s.status !== "COMPLETED") return err(404, "PROFILE_PENDING", "Chưa có kết quả");
      return HttpResponse.json(buildResult(db, s));
    }),
    http.get(`${API}/sessions/:id/review`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const s = own(u, String(params.id));
      if (s === null) return err(404, "NOT_FOUND", "Không tìm thấy phiên");
      if (s === "forbidden") return err(403, "FORBIDDEN", "Không có quyền");
      if (s.status !== "COMPLETED") return err(403, "FORBIDDEN", "Chỉ xem được sau khi hoàn thành");
      if (!db.reviewEnabled) return err(403, "REVIEW_DISABLED", "Xem lại đáp án đang tạm đóng");
      return HttpResponse.json(buildReview(db, s));
    }),

    // ───────── Hồ sơ ─────────
    http.get(`${API}/placement-profiles/:code/history`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const target = USERS.find((x) => x.studentCode === String(params.code));
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy sinh viên");
      if (u.role === "STUDENT" && target.id !== u.id)
        return err(403, "FORBIDDEN", "Không có quyền");

      return HttpResponse.json(historyFor(db, target.id));
    }),
    http.get(`${API}/placement-profiles/:code`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      const target = USERS.find((x) => x.studentCode === String(params.code));
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy sinh viên");
      if (u.role === "STUDENT" && target.id !== u.id)
        return err(403, "FORBIDDEN", "Không có quyền");

      const history = historyFor(db, target.id);
      const last = db.sessions
        .filter((s) => s.studentId === target.id && s.status === "COMPLETED")
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
      const view: StudentProfileView = {
        student: { studentCode: target.studentCode ?? "", fullName: target.fullName },
        latest: last ? buildResult(db, last) : null,
        history,
      };
      return HttpResponse.json(view);
    }),

    // ───────── Ngân hàng câu hỏi ─────────
    http.get(`${API}/items`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      const q = new URL(request.url).searchParams;
      const page = Math.max(1, Number(q.get("page") ?? 1));
      const limit = Math.min(100, Math.max(1, Number(q.get("limit") ?? 10)));
      const kw = (q.get("q") ?? "").toLowerCase();
      const rows = db.items.filter(
        (i) =>
          (!q.get("skill") || i.skill === q.get("skill")) &&
          (!q.get("cefr") || i.cefrTarget === q.get("cefr")) &&
          (!q.get("status") || i.status === q.get("status")) &&
          (!q.get("source") || i.source === q.get("source")) &&
          (!kw || i.content.toLowerCase().includes(kw)),
      );
      const data = rows.slice((page - 1) * limit, page * limit).map((i) => {
        const d = toDetail(i);
        return {
          id: d.id,
          content: d.content,
          skill: d.skill,
          cefrTarget: d.cefrTarget,
          topicTag: d.topicTag,
          status: d.status,
          source: d.source,
          irtB: d.irtB,
          updatedAt: d.updatedAt,
        };
      });
      return HttpResponse.json({ data, total: rows.length });
    }),
    http.post(`${API}/items/generate-explanation`, async ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      const b = (await request.json().catch(() => null)) as { correctAnswer?: OptionKey } | null;
      const ok = b?.correctAnswer ?? "A";
      return HttpResponse.json({
        v: 1,
        general: "(mock) Giải thích chung do AI sinh.",
        options: Object.fromEntries(
          OPTION_KEYS.map((k) => [k, k === ok ? "(mock) Đáp án đúng." : "(mock) Phương án sai."]),
        ),
      });
    }),
    http.get(`${API}/items/:id`, ({ request, params }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      const it = db.items.find((x) => x.id === String(params.id));
      return it ? HttpResponse.json(toDetail(it)) : err(404, "NOT_FOUND", "Không tìm thấy câu hỏi");
    }),
    // DC-32 (#106): không còn POST/PUT/DELETE/clone/approve/reject câu hỏi bằng form — câu vào hệ thống qua lô.

    // ───────── Báo cáo ─────────
    http.get(`${API}/reports/class-distribution`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      return HttpResponse.json(mockDistribution(u.role === "ADMIN", db));
    }),
    http.get(`${API}/reports/error-patterns`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      return HttpResponse.json(MOCK_ERROR_PATTERNS);
    }),
    http.get(`${API}/reports/export-csv`, ({ request }: Req) => {
      const u = authUser(request);
      if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
      if (!isStaffUser(u)) return err(403, "FORBIDDEN", "Không có quyền");
      const type =
        new URL(request.url).searchParams.get("type") === "profiles" ? "profiles" : "distribution";
      const csv =
        type === "profiles"
          ? toCsv([
              ["MSSV", "Họ tên", "CEFR"],
              ["SV2026001", "Nguyễn Văn An (mock)", "A2"],
            ])
          : toCsv([
              ["CEFR", "Số SV"],
              ...mockDistribution(false, db).distribution.map((d) => [d.cefrLevel, d.count]),
            ]);
      return new HttpResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="mock-${type}.csv"`,
        },
      });
    }),
  ];
}

/** Dựng DB giả + dữ liệu lịch sử cho sinh viên 1, trả về cả handler. */
export function createMockApi(now: () => number = Date.now) {
  const db = createDb(now);
  const past = startSession(db, "u-sv1");
  past.startedAt = new Date("2026-09-20T09:00:00+07:00").getTime();
  past.expiresAt = past.startedAt + 45 * 60_000;
  for (const [id, chosen] of [
    ["mock-i-1", "B"],
    ["mock-i-3", "A"],
    ["mock-i-6", "B"],
    ["mock-i-7", "A"],
    ["mock-i-9", "A"],
    ["mock-i-10", "A"],
  ] as [string, OptionKey][]) {
    past.currentItemId = id;
    submitAnswer(db, past, id, chosen);
  }
  past.completedAt = past.startedAt + 20 * 60_000;
  void ITEM_STATUSES;
  return { db, handlers: createHandlers(db) };
}
