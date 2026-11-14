// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USERS } from "@/mocks/db";
import { makeMockToken } from "@/mocks/handlers";
import { createMockServer } from "@/mocks/server";

const API = "http://localhost:3001/api/v1";
const clock = new Date("2026-11-14T10:00:00+07:00").getTime();
const { server } = createMockServer(() => clock);

const bearer = (id: string) => ({
  authorization: `Bearer ${makeMockToken(
    USERS.find((u) => u.id === id)!,
    clock,
  )}`,
});
const get = (path: string, id: string) => fetch(`${API}${path}`, { headers: bearer(id) });
const send = (method: string, path: string, id: string) =>
  fetch(`${API}${path}`, { method, headers: bearer(id) });
const upload = (kind: string) => {
  const form = new FormData();
  form.append("file", new Blob(["x"]), "ds.xlsx");
  // Không đặt content-type để fetch tự thêm boundary cho multipart
  return fetch(`${API}/users/import/upload?kind=${kind}`, {
    method: "POST",
    headers: bearer("u-ad1"),
    body: form,
  });
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("mock API: import tài khoản bằng file (S19)", () => {
  it("upload: cộng dồn vào lưới đúng loại, báo dòng bị loại và dòng đã tồn tại", async () => {
    const first = await (await upload("STUDENT")).json();
    const second = await (await upload("STUDENT")).json();
    const teacher = await (await upload("TEACHER")).json();

    expect(first.added).toBe(2);
    expect(second.grid).toHaveLength(4);
    expect(teacher.grid).toHaveLength(2);
    expect(first.rejected[0].code).toBe("INVALID_EMAIL");
    expect(first.existing[0]).toMatchObject({ field: "email" });
  });

  it("xóa dòng, xóa cả lưới; kiểm tra quyền và tham số", async () => {
    const grid = (await (await get("/users/import/grid?kind=STUDENT", "u-ad1")).json()).grid;
    const del = await send("DELETE", `/users/import/grid/${grid[0].rowKey}?kind=STUDENT`, "u-ad1");
    expect((await del.json()).grid).toHaveLength(grid.length - 1);
    expect((await send("DELETE", "/users/import/grid?kind=STUDENT", "u-ad1")).status).toBe(204);
    expect((await (await get("/users/import/grid?kind=STUDENT", "u-ad1")).json()).grid).toEqual([]);
    expect((await get("/users/import/grid?kind=STUDENT", "u-gv1")).status).toBe(403);
    expect((await get("/users/import/grid?kind=ADMIN", "u-ad1")).status).toBe(400);
  });

  it("lưu: lưới rỗng ⇒ 422; có dòng ⇒ 202, PROCESSING rồi DONE và lưới được xóa", async () => {
    expect((await send("POST", "/users/import/save?kind=STUDENT", "u-ad1")).status).toBe(422);

    await upload("STUDENT");
    const save = await send("POST", "/users/import/save?kind=STUDENT", "u-ad1");
    expect(save.status).toBe(202);
    expect((await save.json()).total).toBe(2);
    expect((await send("POST", "/users/import/save?kind=STUDENT", "u-ad1")).status).toBe(409);

    const polled: string[] = [];
    for (let i = 0; i < 5; i++) {
      const status = await (await get("/users/import/save-status?kind=STUDENT", "u-ad1")).json();
      polled.push(status.status);
      if (status.status === "DONE") {
        expect(status).toMatchObject({ created: 2, queued: 2 });
        break;
      }
    }
    expect(polled[0]).toBe("PROCESSING");
    expect(polled[polled.length - 1]).toBe("DONE");
    expect((await (await get("/users/import/grid?kind=STUDENT", "u-ad1")).json()).grid).toEqual([]);
  });

  it("tải mẫu trả file kèm tên", async () => {
    const res = await get("/users/import/template?kind=TEACHER", "u-ad1");
    expect(res.headers.get("content-disposition")).toContain("mock-teacher.xlsx");
  });
});
