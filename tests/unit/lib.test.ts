import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "@/lib/api/errors";
import { normalizeNextItem, normalizeReview, normalizeSessionResult, toExamItem } from "@/lib/api/normalize";
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

  it("normalizeNextItem chuẩn hóa dữ liệu { kind: 'item' } và fallback bare item từ backend", () => {
    // 1. Chuẩn hợp đồng
    const itemPayload = {
      kind: "item",
      session: {
        id: "sess-1",
        itemCount: 2,
        maxItems: 25,
        expiresAt: "2026-11-16T18:00:00.000Z",
        serverTime: "2026-11-16T17:15:00.000Z",
      },
      item: {
        id: "item-1",
        content: "What is this?",
        options: { A: "1", B: "2", C: "3", D: "4" },
        skill: "GRAMMAR",
      },
    };
    const norm1 = normalizeNextItem(itemPayload);
    expect(norm1.kind).toBe("item");
    if (norm1.kind === "item") {
      expect(norm1.item.id).toBe("item-1");
      expect(norm1.session.itemCount).toBe(2);
    }

    // 2. Finished
    const finishPayload = {
      kind: "finished",
      reason: "SE_THRESHOLD",
      sessionId: "sess-1",
    };
    const norm2 = normalizeNextItem(finishPayload);
    expect(norm2.kind).toBe("finished");
    if (norm2.kind === "finished") {
      expect(norm2.reason).toBe("SE_THRESHOLD");
      expect(norm2.sessionId).toBe("sess-1");
    }

    // 3. Fallback bare item
    const bareItem = {
      id: "item-bare",
      content: "Bare question?",
      options: { A: "1", B: "2", C: "3", D: "4" },
      skill: "VOCABULARY",
    };
    const norm3 = normalizeNextItem(bareItem);
    expect(norm3.kind).toBe("item");
    if (norm3.kind === "item") {
      expect(norm3.item.id).toBe("item-bare");
      expect(norm3.item.skill).toBe("VOCABULARY");
      expect(norm3.session.maxItems).toBe(25);
    }
  });

  it("normalizeSessionResult chuyển đổi dữ liệu phẳng từ backend sang SessionResult đầy đủ", () => {
    const res = normalizeSessionResult({
      sessionId: "s1",
      thetaFinal: 0.12,
      seFinal: 0.3,
      stoppingReason: "SE_REACHED",
      totalItems: 18,
      durationSeconds: 1200,
    });
    expect(res.ability.theta).toBe(0.12);
    expect(res.ability.standardError).toBe(0.3);
    expect(res.meta.stoppingReason).toBe("SE_REACHED");
    expect(res.meta.itemsAdministered).toBe(18);
    expect(res.meta.durationSeconds).toBe(1200);
  });

  it("normalizeReview chuẩn hóa câu trả lời từ backend sang ReviewEntry an toàn", () => {
    const raw = [
      {
        questionNumber: 1,
        content: "What is this?",
        options: { A: "One", B: "Two" },
        selectedAnswer: "A",
        correctAnswer: "A",
        isCorrect: true,
        skill: "VOCABULARY",
        explanation: "Good job",
      },
      {
        content: "Second question",
        selectedAnswer: "B",
        correctAnswer: "C",
      },
    ];
    const res = normalizeReview(raw);
    expect(res).toHaveLength(2);
    expect(res[0]!.order).toBe(1);
    expect(res[0]!.chosen).toBe("A");
    expect(res[0]!.correct).toBe("A");
    expect(res[0]!.isCorrect).toBe(true);
    expect(res[1]!.order).toBe(2);
    expect(res[1]!.chosen).toBe("B");
    expect(res[1]!.correct).toBe("C");
    expect(res[1]!.isCorrect).toBe(false);
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
    expect(isAllowedProxyPath(["exam-rounds", "mine"])).toBe(true);
    expect(isAllowedProxyPath(["exam-rounds", "round-uuid-1"])).toBe(true);
    expect(isAllowedProxyPath(["exam-rounds", "round-uuid-1", "session", "current"])).toBe(true);
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
    expect(homeFor("ADMIN")).toBe("/admin/dashboard");
    expect(homeFor("TEACHER")).toBe("/teacher/items");
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
