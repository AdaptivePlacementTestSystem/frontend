// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { API_BASE_URL: "http://api.test/api/v1" } }));

import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { GET as proxyGet } from "@/app/api/proxy/[...path]/route";

const upstream429 = () =>
  new Response(
    JSON.stringify({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau 60 giây.",
    }),
    { status: 429, headers: { "content-type": "application/json" } },
  );

const json = (body: unknown, extra: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...extra },
  body: JSON.stringify(body),
});

describe("BFF: giới hạn tần suất (429) báo số giây phải chờ", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(upstream429());
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const expectRateLimited = async (res: Response) => {
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.message).toContain("60 giây");
    expect(body.retryAfterSeconds).toBe(60);
  };

  it("đăng nhập", async () => {
    await expectRateLimited(
      await login(
        new Request("http://x/api/auth/login", json({ email: "a@e.com", password: "x" })),
      ),
    );
  });

  it("quên mật khẩu", async () => {
    await expectRateLimited(
      await forgotPassword(
        new Request("http://x/api/auth/forgot-password", json({ email: "a@e.com" })),
      ),
    );
  });

  it("đặt lại mật khẩu", async () => {
    await expectRateLimited(
      await resetPassword(
        new Request(
          "http://x/api/auth/reset-password",
          json({ email: "a@e.com", otp: "123456", newPassword: "Abcdef1!" }),
        ),
      ),
    );
  });

  it("đổi mật khẩu", async () => {
    await expectRateLimited(
      await changePassword(
        new NextRequest(
          "http://x/api/auth/change-password",
          json({ currentPassword: "a", newPassword: "Abcdef1!" }, { cookie: "apt_token=t" }),
        ),
      ),
    );
  });

  it("proxy chung chuyển nguyên thân 429 của backend (có số giây)", async () => {
    const res = await proxyGet(
      new NextRequest("http://x/api/proxy/students", { headers: { cookie: "apt_token=t" } }),
      { params: Promise.resolve({ path: ["students"] }) } as never,
    );

    expect(res.status).toBe(429);
    expect((await res.json()).message).toContain("60 giây");
  });

  it("backend 429 không kèm số giây: vẫn trả thông điệp báo chờ, không thiếu", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "RATE_LIMITED" }), { status: 429 }),
    );

    const res = await login(
      new Request("http://x/api/auth/login", json({ email: "a@e.com", password: "x" })),
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.message).toContain("thử lại");
    expect(body.retryAfterSeconds).toBeUndefined();
  });
});
