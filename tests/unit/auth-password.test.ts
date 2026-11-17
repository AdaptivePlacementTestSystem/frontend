// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { API_BASE_URL: "http://api.test/api/v1" } }));

import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { newPasswordSchema } from "@/features/auth/password-schema";

const cookie = { cookie: "apt_token=tok123", "content-type": "application/json" };

const upstream = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("newPasswordSchema (BR-06, #134 D4)", () => {
  it.each(["Abcdef1!", "Mật-khẩu-Mới9", "Xy7#xxxxxxxx"])("chấp nhận %s", (value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["12345678", "chỉ có số"],
    ["matkhaumoi", "chỉ chữ thường"],
    ["MATKHAUMOI1!", "thiếu chữ thường"],
    ["matkhaumoi1!", "thiếu chữ hoa"],
    ["Matkhaumoi!", "thiếu chữ số"],
    ["Matkhaumoi1", "thiếu ký tự đặc biệt"],
    ["Ab1!", "quá ngắn"],
    ["", "rỗng"],
  ])("từ chối %j (%s)", (value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });

  it("báo đúng lý do chính sách thay vì sai mật khẩu hiện tại", () => {
    const result = newPasswordSchema.safeParse("12345678");
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toContain("chữ thường, chữ hoa, chữ số và ký tự đặc biệt");
    expect(message).not.toContain("hiện tại");
  });
});

describe("BFF đổi mật khẩu: phân biệt các loại lỗi của backend", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const call = async () => {
    const res = await changePassword(
      new NextRequest("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: cookie,
        body: JSON.stringify({ currentPassword: "Cur#rent1x", newPassword: "12345678" }),
      }),
    );
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };

  it("mật khẩu mới không đạt chính sách (400 không mã, message là mảng): VALIDATION_FAILED, không phải sai mật khẩu hiện tại", async () => {
    fetchMock.mockResolvedValue(
      upstream(400, {
        statusCode: 400,
        message: ["Mật khẩu mới phải có ít nhất 8 ký tự, gồm ..."],
        error: "Bad Request",
      }),
    );

    const { status, body } = await call();

    expect(status).toBe(400);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.code).not.toBe("CURRENT_PASSWORD_INVALID");
  });

  it("sai mật khẩu hiện tại (backend trả INVALID_CREDENTIALS): CURRENT_PASSWORD_INVALID", async () => {
    fetchMock.mockResolvedValue(
      upstream(400, { code: "INVALID_CREDENTIALS", message: "Mật khẩu hiện tại không chính xác" }),
    );

    const { status, body } = await call();

    expect(status).toBe(400);
    expect(body.code).toBe("CURRENT_PASSWORD_INVALID");
  });

  it("mật khẩu mới trùng mật khẩu cũ (VALIDATION_FAILED có mã): giữ nguyên mã", async () => {
    fetchMock.mockResolvedValue(
      upstream(400, { code: "VALIDATION_FAILED", message: "Mật khẩu mới không được trùng" }),
    );

    expect((await call()).body.code).toBe("VALIDATION_FAILED");
  });

  it("thành công: 204 và ghi lại cookie token mới", async () => {
    fetchMock.mockResolvedValue(upstream(200, { accessToken: "new.jwt.token" }));

    const res = await changePassword(
      new NextRequest("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: cookie,
        body: JSON.stringify({ currentPassword: "Cur#rent1x", newPassword: "New#Pass-1x" }),
      }),
    );

    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("apt_token=new.jwt.token");
  });

  it("lỗi máy chủ 500: UNKNOWN, không gán nhầm là sai mật khẩu", async () => {
    fetchMock.mockResolvedValue(upstream(500, { message: "boom" }));

    const { status, body } = await call();

    expect(status).toBe(502);
    expect(body.code).toBe("UNKNOWN");
  });
});

describe("BFF đặt lại mật khẩu: mật khẩu yếu không bị báo là OTP sai", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const call = async () => {
    const res = await resetPassword(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@e.com", otp: "123456", newPassword: "12345678" }),
      }),
    );
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };

  it("400 không mã với message là mảng: VALIDATION_FAILED", async () => {
    fetchMock.mockResolvedValue(
      upstream(400, { statusCode: 400, message: ["Mật khẩu mới phải có ..."] }),
    );

    expect((await call()).body.code).toBe("VALIDATION_FAILED");
  });

  it("OTP sai (INVALID_RESET_OTP): giữ nguyên mã", async () => {
    fetchMock.mockResolvedValue(upstream(400, { code: "INVALID_RESET_OTP", message: "x" }));

    const { status, body } = await call();

    expect(status).toBe(400);
    expect(body.code).toBe("INVALID_RESET_OTP");
  });

  it("400 trơn không có mã và không có mảng message vẫn coi là OTP sai (hành vi cũ)", async () => {
    fetchMock.mockResolvedValue(upstream(400, { message: "x" }));

    expect((await call()).body.code).toBe("INVALID_RESET_OTP");
  });
});
