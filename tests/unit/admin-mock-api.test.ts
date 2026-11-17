import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS } from "@/mocks/db";
import { MOCK_ROUND_ID } from "@/mocks/admin-handlers";
import { makeMockToken } from "@/mocks/handlers";
import { createMockServer } from "@/mocks/server";

const API = "http://localhost:3001/api/v1";
const clock = new Date("2026-11-14T10:00:00+07:00").getTime();
const { server } = createMockServer(() => clock);

const as = (id: string) => ({
  authorization: `Bearer ${makeMockToken(
    USERS.find((u) => u.id === id)!,
    clock,
  )}`,
  "content-type": "application/json",
});
const call = (path: string, id: string, init: RequestInit = {}) =>
  fetch(`${API}${path}`, { ...init, headers: { ...as(id), ...(init.headers as object) } });
const send = (method: string, path: string, id: string, body?: unknown) =>
  call(path, id, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("mock API khu Admin: quyền truy cập", () => {
  it.each(["/reports/overview", "/students", "/teachers"])(
    "%s: GV và SV bị 403, không token bị 401",
    async (path) => {
      expect((await call(path, "u-gv1")).status).toBe(403);
      expect((await call(path, "u-sv1")).status).toBe(403);
      expect((await fetch(`${API}${path}`)).status).toBe(401);
      expect((await call(path, "u-ad1")).status).toBe(200);
    },
  );
});

describe("mock API: tổng quan hệ thống", () => {
  it("trả 6 mức CEFR, 6 trạng thái câu và bảng kỳ thi; lọc kỳ chỉ đổi SV/CEFR", async () => {
    const all = await (await call("/reports/overview", "u-ad1")).json();
    const filtered = await (
      await call(`/reports/overview?examRoundId=${MOCK_ROUND_ID}`, "u-ad1")
    ).json();

    expect(Object.keys(all.cefrDistribution)).toHaveLength(6);
    expect(Object.keys(all.itemStatusCounts)).toHaveLength(6);
    expect(all.studentsCompleted).toBe(1240);
    expect(filtered.studentsCompleted).toBeLessThan(all.studentsCompleted);
    expect(filtered.finalApprovedItems).toBe(all.finalApprovedItems);
    expect(filtered.examRoundId).toBe(MOCK_ROUND_ID);
    const round = all.openRounds[0];
    expect(round.notStarted + round.inProgress + round.completed).toBe(round.participantCount);
  });

  it("kỳ thi không tồn tại: 404", async () => {
    expect((await call("/reports/overview?examRoundId=khong-co", "u-ad1")).status).toBe(404);
  });
});

describe("mock API: tài khoản", () => {
  it("danh sách SV không có GV/Admin; danh sách GV có cả Admin; tìm theo MSSV", async () => {
    const students = await (await call("/students", "u-ad1")).json();
    const teachers = await (await call("/teachers", "u-ad1")).json();
    const found = await (await call("/students?q=SV2026002", "u-ad1")).json();

    expect(students.items.every((a: { role: string }) => a.role === "STUDENT")).toBe(true);
    expect(teachers.items.map((a: { role: string }) => a.role).sort()).toEqual([
      "ADMIN",
      "TEACHER",
    ]);
    expect(found.total).toBe(1);
    expect(found.items[0].studentCode).toBe("SV2026002");
  });

  it("tạo SV: 201, email chữ thường, phải đổi mật khẩu; trùng email/MSSV ⇒ 409 kèm details.field", async () => {
    const ok = await send("POST", "/students", "u-ad1", {
      studentCode: "SV7000",
      fullName: "Người Mới",
      email: "Moi@Example.Test",
    });
    expect(ok.status).toBe(201);
    const created = await ok.json();
    expect(created).toMatchObject({
      email: "moi@example.test",
      mustChangePassword: true,
      isActive: true,
    });
    expect(JSON.stringify(created)).not.toMatch(/passwordHash|\$argon2/);

    const dupEmail = await send("POST", "/students", "u-ad1", {
      studentCode: "SV7001",
      fullName: "X",
      email: "moi@example.test",
    });
    expect(dupEmail.status).toBe(409);
    expect((await dupEmail.json()).details).toEqual({ field: "email" });

    const dupCode = await send("POST", "/students", "u-ad1", {
      studentCode: "SV7000",
      fullName: "X",
      email: "khac@example.test",
    });
    expect((await dupCode.json()).details).toEqual({ field: "studentCode" });
  });

  it("sửa họ tên; sai loại (SV qua /teachers) ⇒ 404; email trùng ⇒ 409", async () => {
    expect((await send("PATCH", "/students/u-sv1", "u-ad1", { fullName: "Tên Mới" })).status).toBe(
      200,
    );
    expect((await send("PATCH", "/teachers/u-sv1", "u-ad1", { fullName: "X" })).status).toBe(404);
    const dup = await send("PATCH", "/students/u-sv1", "u-ad1", { email: "sv002@example.test" });
    expect(dup.status).toBe(409);
  });

  it("khóa/mở khóa: không tự khóa, không khóa Admin, SV khóa được rồi mở lại", async () => {
    expect((await send("POST", "/users/u-ad1/lock", "u-ad1")).status).toBe(403);
    const lock = await send("POST", "/users/u-sv2/lock", "u-ad1");
    expect((await lock.json()).isActive).toBe(false);
    const unlock = await send("POST", "/users/u-sv2/unlock", "u-ad1");
    expect((await unlock.json()).isActive).toBe(true);
  });

  it("đổi role: chỉ TEACHER ↔ ADMIN, không đổi SV, không tự thu hồi", async () => {
    expect((await send("PATCH", "/users/u-sv1/role", "u-ad1", { role: "ADMIN" })).status).toBe(400);
    expect((await send("PATCH", "/users/u-ad1/role", "u-ad1", { role: "TEACHER" })).status).toBe(
      403,
    );
    expect((await send("PATCH", "/users/u-gv1/role", "u-ad1", { role: "STUDENT" })).status).toBe(
      400,
    );
    const up = await send("PATCH", "/users/u-gv1/role", "u-ad1", { role: "ADMIN" });
    expect((await up.json()).role).toBe("ADMIN");
  });

  it("gửi lại mật khẩu tạm: đặt mustChangePassword, không áp dụng cho Admin", async () => {
    const ok = await send("POST", "/users/u-sv1/resend-temporary-password", "u-ad1");
    expect((await ok.json()).mustChangePassword).toBe(true);
    expect((await send("POST", "/users/u-ad1/resend-temporary-password", "u-ad1")).status).toBe(
      403,
    );
  });
});
