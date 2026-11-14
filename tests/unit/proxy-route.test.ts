// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { API_BASE_URL: "http://api.test/api/v1" } }));

import { PATCH, POST } from "@/app/api/proxy/[...path]/route";

const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) }) as never;
const withToken = { cookie: "apt_token=tok123" };

describe("BFF proxy: thân yêu cầu", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("multipart (tải file import): chuyển nguyên byte nhị phân, giữ content-type có boundary", async () => {
    // Byte không phải UTF-8 hợp lệ: nếu đọc như văn bản sẽ bị hỏng
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00, 0x80, 0xc3, 0x28]);
    const form = new FormData();
    form.append("file", new Blob([bytes]), "ds.xlsx");
    const req = new NextRequest("http://localhost/api/proxy/users/import/upload?kind=STUDENT", {
      method: "POST",
      headers: withToken,
      body: form,
    });

    const res = await POST(req, ctx("users", "import", "upload"));

    expect(res.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/users/import/upload?kind=STUDENT");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer tok123");
    expect(headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(init.body).toBeInstanceOf(ArrayBuffer);
    const sent = Buffer.from(init.body as ArrayBuffer);
    expect(sent.includes(Buffer.from(bytes))).toBe(true); // byte gốc còn nguyên bên trong thân multipart
  });

  it("JSON: vẫn chuyển dưới dạng văn bản", async () => {
    const req = new NextRequest("http://localhost/api/proxy/students", {
      method: "POST",
      headers: { ...withToken, "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Nguyễn Văn A" }),
    });

    await POST(req, ctx("students"));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('{"fullName":"Nguyễn Văn A"}');
  });

  it("PATCH được hỗ trợ (sửa tài khoản, đổi role)", async () => {
    const req = new NextRequest("http://localhost/api/proxy/users/abc-1/role", {
      method: "PATCH",
      headers: { ...withToken, "content-type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });

    const res = await PATCH(req, ctx("users", "abc-1", "role"));

    expect(res.status).toBe(202);
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("PATCH");
  });

  it("đường dẫn không nằm trong danh sách cho phép: 404, không gọi backend", async () => {
    const req = new NextRequest("http://localhost/api/proxy/users/import/evil", {
      method: "POST",
      headers: withToken,
      body: "x",
    });

    const res = await POST(req, ctx("users", "import", "evil"));

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("không có token: 401, không gọi backend", async () => {
    const req = new NextRequest("http://localhost/api/proxy/students", {
      method: "POST",
      body: "{}",
    });

    const res = await POST(req, ctx("students"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
