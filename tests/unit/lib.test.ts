import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "@/lib/api/errors";
import { normalizeNextItem, toExamItem } from "@/lib/api/normalize";
import { buildUrl } from "@/lib/api/client";
import { isAllowedProxyPath } from "@/lib/api/proxy-policy";
import { decodeJwtClaims, isExpired } from "@/lib/auth/jwt";
import { homeFor, routeVerdict } from "@/lib/auth/roles";
import { toCurrentUser } from "@/lib/auth/user";
import { parseExplanation } from "@/lib/explanation";
import { formatClock, remainingSeconds } from "@/features/exam/use-countdown";
import { safeNext } from "@/features/auth/login-form";

const rawItem = {
  id: "i1",
  content: "Q?",
  options: { A: "a", B: "b", C: "c", D: "d" },
  skill: "GRAMMAR",
  correctAnswer: "B", // không được lọt ra giao diện
  irtB: 0.3,
  cefrTarget: "A2",
};

describe("normalize — chống lộ đáp án", () => {
  it("chỉ giữ id, content, options, skill", () => {
    expect(Object.keys(toExamItem(rawItem)).sort()).toEqual(["content", "id", "options", "skill"]);
  });

  it("dữ liệu cũ {message} ⇒ NO_ITEMS_AVAILABLE", () => {
    expect(() => normalizeNextItem({ message: "Không còn câu hỏi" })).toThrowError(ApiError);
    try {
      normalizeNextItem({ message: "x" });
    } catch (e) {
      expect((e as ApiError).code).toBe("NO_ITEMS_AVAILABLE");
    }
  });
});

describe("errors", () => {
  it("dùng code của backend nếu biết, nếu không suy ra từ mã HTTP", () => {
    expect(toApiError(409, { code: "SESSION_IN_PROGRESS" }).code).toBe("SESSION_IN_PROGRESS");
    expect(toApiError(403, { code: "REVIEW_DISABLED" }).code).toBe("REVIEW_DISABLED");
    expect(toApiError(404, {}).code).toBe("NOT_FOUND");
    expect(toApiError(500, "boom").code).toBe("UNKNOWN");
    expect(toApiError(400, { code: "LA_HOAC" }).code).toBe("VALIDATION_FAILED");
  });
});

describe("buildUrl", () => {
  it("bỏ tham số rỗng", () => {
    expect(buildUrl("/x", { a: 1, b: "", c: undefined, d: "z" })).toBe("/x?a=1&d=z");
    expect(buildUrl("/x")).toBe("/x");
  });
});

describe("proxy-policy", () => {
  it("cho phép route đã biết, chặn route lạ và đường dẫn nguy hiểm", () => {
    expect(isAllowedProxyPath(["sessions", "active"])).toBe(true);
    expect(isAllowedProxyPath(["sessions", "abc-1", "next-item"])).toBe(true);
    expect(isAllowedProxyPath(["items", "abc", "clone"])).toBe(true);
    expect(isAllowedProxyPath(["reports", "export-csv"])).toBe(true);
    expect(isAllowedProxyPath(["admin", "users"])).toBe(false);
    expect(isAllowedProxyPath(["items", ".."])).toBe(false);
    expect(isAllowedProxyPath(["items", "a%2Fb"])).toBe(false);
    expect(isAllowedProxyPath([])).toBe(false);
  });
});

describe("auth", () => {
  const token = (p: object) => `x.${Buffer.from(JSON.stringify(p)).toString("base64url")}.y`;

  it("giải mã JWT và nhận biết hết hạn", () => {
    const c = decodeJwtClaims(token({ sub: "1", role: "TEACHER", exp: 100 }));
    expect(c?.role).toBe("TEACHER");
    expect(isExpired(c, 99_000)).toBe(false);
    expect(isExpired(c, 101_000)).toBe(true);
    expect(decodeJwtClaims("rác")).toBeNull();
    expect(isExpired(null)).toBe(true);
  });

  it("điều hướng theo vai trò", () => {
    expect(routeVerdict("/teacher/items", null)).toBe("login");
    expect(routeVerdict("/login", null)).toBe("allow");
    expect(routeVerdict("/forgot-password", null)).toBe("allow");
    expect(routeVerdict("/reset-password", null)).toBe("allow");
    expect(routeVerdict("/change-password", null)).toBe("login");
    expect(routeVerdict("/change-password", "TEACHER")).toBe("allow");
    expect(routeVerdict("/login", "STUDENT")).toBe("redirect-home");
    expect(routeVerdict("/teacher/items", "STUDENT")).toBe("forbidden");
    expect(routeVerdict("/", "TEACHER")).toBe("redirect-home");
    expect(routeVerdict("/exam/1", "STUDENT")).toBe("allow");
    expect(homeFor("ADMIN")).toBe("/teacher/items");
    expect(homeFor("STUDENT")).toBe("/");
  });

  it("chuẩn hóa người dùng (payload JWT thiếu fullName ⇒ dùng email)", () => {
    expect(toCurrentUser({ sub: "u1", email: "a@b.c", role: "STUDENT" })?.fullName).toBe("a@b.c");
    expect(toCurrentUser({ email: "a@b.c", role: "NHAM" })).toBeNull();
  });

  it("chỉ chấp nhận đường dẫn nội bộ sau đăng nhập (chống open-redirect)", () => {
    expect(safeNext("/teacher/items")).toBe("/teacher/items");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});

describe("parseExplanation (#78)", () => {
  it("đọc JSON có phiên bản, chuỗi thường, null và JSON lạ", () => {
    const json = JSON.stringify({ v: 1, general: "G", options: { A: "a", B: " " } });
    expect(parseExplanation(json)).toEqual({ general: "G", options: { A: "a" } });
    expect(parseExplanation("Văn bản cũ")).toEqual({ general: "Văn bản cũ", options: {} });
    expect(parseExplanation(null)).toBeNull();
    expect(parseExplanation("   ")).toBeNull();
    expect(parseExplanation('{"v":9,"x":1}')).toBeNull();
  });
});

describe("đồng hồ đếm ngược theo giờ server", () => {
  it("không phụ thuộc giờ máy khách lệch", () => {
    // máy khách chậm 10 phút so với server, nhưng còn lại vẫn đúng 45 phút
    const server = Date.parse("2026-10-10T10:00:00Z");
    const received = server - 600_000;
    expect(
      remainingSeconds("2026-10-10T10:45:00Z", "2026-10-10T10:00:00Z", received, received),
    ).toBe(2700);
    expect(
      remainingSeconds(
        "2026-10-10T10:45:00Z",
        "2026-10-10T10:00:00Z",
        received,
        received + 2_700_000,
      ),
    ).toBe(0);
    expect(
      remainingSeconds(
        "2026-10-10T10:45:00Z",
        "2026-10-10T10:00:00Z",
        received,
        received + 9_999_999,
      ),
    ).toBe(0);
  });

  it("định dạng mm:ss", () => {
    expect(formatClock(2700)).toBe("45:00");
    expect(formatClock(65)).toBe("01:05");
  });
});
