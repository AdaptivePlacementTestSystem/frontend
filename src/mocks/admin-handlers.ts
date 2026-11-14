import { http, HttpResponse, type HttpHandler } from "msw";
import { CEFR_LEVELS, ITEM_STATUSES } from "@apt/shared-types";
import type {
  AdminAccount,
  AssignableRole,
  CreateAccountBody,
  SystemOverview,
  UpdateAccountBody,
} from "@/lib/api/types";
import type { MockUser } from "./db";

/**
 * Backend GIẢ cho khu Admin (F-22 quản lý tài khoản, F-29 tổng quan). Bám hợp đồng của backend thật:
 * quy tắc Admin tự khóa/khóa Admin/đổi role sinh viên, 409 CONFLICT kèm `details.field`, lọc `examRoundId`.
 */
type Params = Record<string, string | readonly string[] | undefined>;
type Req = { request: Request; params: Params };
type ErrFn = (status: number, code: string, message: string, details?: unknown) => Response;

interface Deps {
  api: string;
  authUser: (request: Request) => MockUser | null;
  err: ErrFn;
  now: () => number;
}

export const MOCK_ROUND_ID = "3f2b8a52-6c1d-4f8e-9a57-1b2c3d4e5f60";

const acc = (
  id: string,
  role: AdminAccount["role"],
  fullName: string,
  email: string,
  code: { studentCode?: string; teacherCode?: string },
  extra: Partial<AdminAccount> = {},
): AdminAccount => ({
  id,
  role,
  fullName,
  email,
  ...code,
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-11-01T08:00:00.000Z",
  ...extra,
});

export function seedAccounts(): AdminAccount[] {
  return [
    acc("u-sv1", "STUDENT", "Nguyễn Văn An (mock)", "sv001@example.test", {
      studentCode: "SV2026001",
    }),
    acc(
      "u-sv2",
      "STUDENT",
      "Lê Thị Cúc (mock)",
      "sv002@example.test",
      { studentCode: "SV2026002" },
      {
        mustChangePassword: true,
      },
    ),
    acc(
      "u-lock",
      "STUDENT",
      "Bị khóa (mock)",
      "locked@example.test",
      { studentCode: "SV2026999" },
      {
        isActive: false,
      },
    ),
    acc("u-gv1", "TEACHER", "Trần Thị Bình (mock)", "gv001@example.test", { teacherCode: "GV001" }),
    acc("u-ad1", "ADMIN", "Quản trị (mock)", "admin@example.test", { teacherCode: "" }),
  ];
}

const zero = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function buildOverview(now: number, examRoundId: string | null): SystemOverview {
  const cefr = zero(CEFR_LEVELS);
  Object.assign(cefr, { PRE_A1: 43, A1: 188, A2: 353, B1: 300, B2: 311, C1_PLUS: 45 });
  const items = zero(ITEM_STATUSES);
  Object.assign(items, {
    DRAFT: 45,
    FIRST_APPROVED: 68,
    SECOND_APPROVED: 52,
    FINAL_APPROVED: 486,
    REJECTED: 18,
    AI_REJECTED: 24,
  });
  const scale = examRoundId ? 0.5 : 1; // lọc theo kỳ chỉ ảnh hưởng SV và CEFR (BR-13)
  for (const k of CEFR_LEVELS) cefr[k] = Math.round(cefr[k] * scale);
  return {
    examRoundId,
    studentsCompleted: Object.values(cefr).reduce((a, b) => a + b, 0),
    finalApprovedItems: items.FINAL_APPROVED,
    batchesNeedingAction: 3,
    openExamRounds: 1,
    cefrDistribution: cefr,
    itemStatusCounts: items,
    openRounds: [
      {
        id: MOCK_ROUND_ID,
        name: "Kỳ thi xếp lớp tân sinh viên 2026 — Đợt 1",
        opensAt: new Date(now - 3_600_000).toISOString(),
        closesAt: new Date(now + 86_400_000).toISOString(),
        durationMinutes: 45,
        participantCount: 660,
        notStarted: 400,
        inProgress: 142,
        completed: 118,
      },
    ],
    generatedAt: new Date(now).toISOString(),
  };
}

export function createAdminHandlers({ api, authUser, err, now }: Deps): HttpHandler[] {
  const accounts = seedAccounts();
  let seq = 100;

  const admin = (request: Request): MockUser | Response => {
    const u = authUser(request);
    if (!u) return err(401, "UNAUTHENTICATED", "Chưa đăng nhập");
    if (u.role !== "ADMIN") return err(403, "FORBIDDEN", "Không có quyền");
    return u;
  };
  const dup = (field: string, message: string) => err(409, "CONFLICT", message, { field });
  const kindOf = (path: string) => (path === "students" ? "STUDENT" : "TEACHER");
  const inKind = (a: AdminAccount, kind: "STUDENT" | "TEACHER") =>
    kind === "STUDENT" ? a.role === "STUDENT" : a.role !== "STUDENT";

  const list =
    (kind: "STUDENT" | "TEACHER") =>
    ({ request }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const url = new URL(request.url);
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
      const rows = accounts.filter(
        (a) =>
          inKind(a, kind) &&
          (!q ||
            [a.email, a.fullName, a.studentCode ?? "", a.teacherCode ?? ""].some((v) =>
              v.toLowerCase().includes(q),
            )),
      );
      return HttpResponse.json({
        items: rows.slice((page - 1) * pageSize, page * pageSize),
        total: rows.length,
        page,
        pageSize,
      });
    };

  const create =
    (kind: "STUDENT" | "TEACHER") =>
    async ({ request }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const b = (await request.json().catch(() => null)) as CreateAccountBody | null;
      const email = b?.email?.trim().toLowerCase();
      const code = (kind === "STUDENT" ? b?.studentCode : b?.teacherCode)?.trim();
      if (!b || !email || !b.fullName?.trim() || !code)
        return err(400, "VALIDATION_FAILED", "Thiếu dữ liệu");
      if (accounts.some((a) => a.email === email)) return dup("email", "Email đã tồn tại.");
      if (accounts.some((a) => (kind === "STUDENT" ? a.studentCode : a.teacherCode) === code))
        return dup(kind === "STUDENT" ? "studentCode" : "teacherCode", "Mã đã tồn tại.");
      const created = acc(
        `u-new-${seq++}`,
        kind,
        b.fullName.trim(),
        email,
        kind === "STUDENT" ? { studentCode: code } : { teacherCode: code },
        { mustChangePassword: true, createdAt: new Date(now()).toISOString() },
      );
      accounts.unshift(created);
      return HttpResponse.json(created, { status: 201 });
    };

  const update =
    (kind: "STUDENT" | "TEACHER") =>
    async ({ request, params }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const target = accounts.find((a) => a.id === String(params.id) && inKind(a, kind));
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
      const b = (await request.json().catch(() => null)) as UpdateAccountBody | null;
      if (!b || (b.fullName === undefined && b.email === undefined))
        return err(400, "VALIDATION_FAILED", "Cần họ tên hoặc email");
      const email = b.email?.trim().toLowerCase();
      if (email && email !== target.email && accounts.some((a) => a.email === email))
        return dup("email", "Email đã tồn tại.");
      if (email) target.email = email;
      if (b.fullName !== undefined) target.fullName = b.fullName.trim();
      return HttpResponse.json(target);
    };

  const find = (params: Params) => accounts.find((a) => a.id === String(params.id));

  return [
    http.get(`${api}/reports/overview`, ({ request }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const round = new URL(request.url).searchParams.get("examRoundId");
      if (round && round !== MOCK_ROUND_ID) return err(404, "NOT_FOUND", "Không tìm thấy kỳ thi.");
      return HttpResponse.json(buildOverview(now(), round));
    }),
    http.get(`${api}/students`, list(kindOf("students"))),
    http.get(`${api}/teachers`, list(kindOf("teachers"))),
    http.post(`${api}/students`, create("STUDENT")),
    http.post(`${api}/teachers`, create("TEACHER")),
    http.patch(`${api}/students/:id`, update("STUDENT")),
    http.patch(`${api}/teachers/:id`, update("TEACHER")),
    http.post(`${api}/users/:id/lock`, ({ request, params }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const target = find(params);
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
      if (target.id === u.id) return err(403, "FORBIDDEN", "Bạn không thể tự khóa chính mình.");
      if (target.role === "ADMIN")
        return err(403, "FORBIDDEN", "Không thể khóa tài khoản quản trị viên.");
      target.isActive = false;
      return HttpResponse.json(target);
    }),
    http.post(`${api}/users/:id/unlock`, ({ request, params }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const target = find(params);
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
      target.isActive = true;
      return HttpResponse.json(target);
    }),
    http.post(`${api}/users/:id/resend-temporary-password`, ({ request, params }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const target = find(params);
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
      if (target.role === "ADMIN")
        return err(403, "FORBIDDEN", "Không gửi lại mật khẩu cho Admin.");
      target.mustChangePassword = true;
      return HttpResponse.json(target);
    }),
    http.patch(`${api}/users/:id/role`, async ({ request, params }: Req) => {
      const u = admin(request);
      if (u instanceof Response) return u;
      const target = find(params);
      if (!target) return err(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
      const b = (await request.json().catch(() => null)) as { role?: AssignableRole } | null;
      if (b?.role !== "ADMIN" && b?.role !== "TEACHER")
        return err(400, "VALIDATION_FAILED", "Quyền không hợp lệ");
      if (target.role === "STUDENT")
        return err(400, "VALIDATION_FAILED", "Không đổi quyền sinh viên.");
      if (target.id === u.id && b.role !== "ADMIN")
        return err(403, "FORBIDDEN", "Bạn không thể tự thu hồi quyền quản trị của mình.");
      target.role = b.role;
      return HttpResponse.json(target);
    }),
  ];
}
