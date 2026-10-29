import { parseEnv } from "@/lib/env-schema";

describe("parseEnv", () => {
  it("chấp nhận cấu hình hợp lệ và áp giá trị mặc định", () => {
    const env = parseEnv({ API_BASE_URL: "http://localhost:3001/api/v1" });
    expect(env.API_BASE_URL).toBe("http://localhost:3001/api/v1");
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Adaptive Placement Test");
  });

  it("báo lỗi rõ khi thiếu API_BASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/API_BASE_URL/);
  });

  it("báo lỗi khi API_BASE_URL không phải URL", () => {
    expect(() => parseEnv({ API_BASE_URL: "khong-phai-url" })).toThrow(/URL hợp lệ/);
  });
});
