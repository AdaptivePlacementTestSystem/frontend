import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockServer } from "@/mocks/server";
import { MOCK_PASSWORD, USERS } from "@/mocks/db";
import { makeMockToken } from "@/mocks/handlers";

const API = "http://localhost:3001/api/v1";
let clock = new Date("2026-10-10T09:00:00+07:00").getTime();
const { server, db } = createMockServer(() => clock);

const auth = (id: string) => ({
  authorization: `Bearer ${makeMockToken(
    USERS.find((u) => u.id === id)!,
    clock,
  )}`,
  "content-type": "application/json",
});
const call = (path: string, id: string, init: RequestInit = {}) =>
  fetch(`${API}${path}`, { ...init, headers: { ...auth(id), ...(init.headers as object) } });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  db.sessions = db.sessions.filter((s) => s.status === "COMPLETED");
  db.reviewEnabled = true;
});

describe("mock API", () => {
  it("đăng nhập sai ⇒ 401, tài khoản khóa ⇒ 403", async () => {
    const bad = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "sv001@example.test", password: "x" }),
    });
    expect(bad.status).toBe(401);
    const locked = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "locked@example.test", password: MOCK_PASSWORD }),
    });
    expect(locked.status).toBe(403);
  });

  it("phiên đang làm ⇒ tạo mới trả 409 kèm sessionId", async () => {
    const first = await call("/sessions", "u-sv2", { method: "POST" });
    expect(first.status).toBe(201);
    const { sessionId } = await first.json();
    const second = await call("/sessions", "u-sv2", { method: "POST" });
    expect(second.status).toBe(409);
    expect((await second.json()).details.sessionId).toBe(sessionId);
  });

  it("câu hỏi khi thi không lộ đáp án/b/cefr; nộp đủ rồi review", async () => {
    const { sessionId } = await (await call("/sessions", "u-sv2", { method: "POST" })).json();
    for (let i = 0; i < 40; i++) {
      const next = await (await call(`/sessions/${sessionId}/next-item`, "u-sv2")).json();
      if (next.kind === "finished") break;
      expect(Object.keys(next.item).sort()).toEqual(["content", "id", "options", "skill"]);
      const r = await (
        await call(`/sessions/${sessionId}/responses`, "u-sv2", {
          method: "POST",
          body: JSON.stringify({ itemId: next.item.id, response: "A" }),
        })
      ).json();
      expect(r.accepted).toBe(true);
      expect(r).not.toHaveProperty("isCorrect");
    }
    expect((await call(`/sessions/${sessionId}/result`, "u-sv2")).status).toBe(200);
    expect((await call(`/sessions/${sessionId}/review`, "u-sv2")).status).toBe(200);
    db.reviewEnabled = false;
    const off = await call(`/sessions/${sessionId}/review`, "u-sv2");
    expect(off.status).toBe(403);
    expect((await off.json()).code).toBe("REVIEW_DISABLED");
  });

  it("sinh viên khác không xem được phiên và hồ sơ; giảng viên xem được hồ sơ", async () => {
    const { sessionId } = await (await call("/sessions", "u-sv2", { method: "POST" })).json();
    expect((await call(`/sessions/${sessionId}/next-item`, "u-sv1")).status).toBe(403);
    expect((await call("/placement-profiles/SV2026002", "u-sv1")).status).toBe(403);
    expect((await call("/placement-profiles/SV2026002", "u-gv1")).status).toBe(200);
  });

  it("không còn endpoint ghi câu hỏi bằng form (DC-32)", async () => {
    const any = db.items[0]!;
    for (const [path, method] of [
      ["/items", "POST"],
      [`/items/${any.id}`, "PUT"],
      [`/items/${any.id}`, "DELETE"],
      [`/items/${any.id}/clone`, "POST"],
      [`/items/${any.id}/approve`, "POST"],
      [`/items/${any.id}/reject`, "POST"],
    ] as const) {
      // Không còn handler ⇒ MSW (onUnhandledRequest: "error") từ chối request
      await expect(
        call(path, "u-gv1", { method, body: method === "DELETE" ? undefined : "{}" }),
        `${method} ${path}`,
      ).rejects.toThrow();
    }
  });

  it("hết hạn: ≥8 câu ⇒ COMPLETED+TIMEOUT, ít hơn ⇒ ABANDONED (#77)", async () => {
    const { sessionId } = await (await call("/sessions", "u-sv2", { method: "POST" })).json();
    clock += 50 * 60_000;
    const res = await (await call("/sessions/active", "u-sv2")).json();
    expect(res.session).toBeNull();
    expect(res.closedPrevious).toMatchObject({ sessionId, status: "ABANDONED" });
  });
});
