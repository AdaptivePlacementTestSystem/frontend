import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { API_BASE_URL: "http://backend:3001/api/v1" } }));

import { GET as deepHealth } from "@/app/api/health/route";
import { GET as liveHealth } from "@/app/api/health/live/route";

describe("/api/health/live", () => {
  it("luôn trả 200 ok", async () => {
    const res = liveHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("/api/health (sâu)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("backend sẵn sàng ⇒ 200 ok", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await deepHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", checks: { frontend: "up", backend: "up" } });
    expect(fetchMock).toHaveBeenCalledWith("http://backend:3001/api/v1/ready", expect.anything());
  });

  it("backend trả 503 ⇒ 503 degraded", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const res = await deepHealth();
    expect(res.status).toBe(503);
    expect((await res.json()).checks.backend).toBe("down");
  });

  it("backend không kết nối được ⇒ 503 và không rò chi tiết lỗi", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:3001"));
    const res = await deepHealth();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/);
  });
});
