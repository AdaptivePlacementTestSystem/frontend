import { CEFR_LEVELS, ITEM_STATUSES } from "@apt/shared-types";
import { describe, expect, it } from "vitest";
import { buildUrl } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isAllowedProxyPath } from "@/lib/api/proxy-policy";
import { homeFor, routeVerdict } from "@/lib/auth/roles";
import { CEFR_COLORS, ITEM_STATUS_COLORS } from "@/lib/ui/badge-colors";
import { formatCount, formatPercent, percentOf } from "@/features/admin-overview/overview-math";
import { vi } from "@/messages/vi";

describe("proxy-policy: route khu Admin", () => {
  it.each([
    [["reports", "overview"]],
    [["students"]],
    [["teachers"]],
    [["students", "0b8f2a52-6c1d-4f8e-9a57-1b2c3d4e5f60"]],
    [["teachers", "abc-123"]],
    [["users", "abc-123", "lock"]],
    [["users", "abc-123", "unlock"]],
    [["users", "abc-123", "resend-temporary-password"]],
    [["users", "abc-123", "role"]],
  ])("cho phép %j", (segments) => {
    expect(isAllowedProxyPath(segments)).toBe(true);
  });

  it.each([
    [["users"]],
    [["users", "abc-123"]],
    [["users", "abc-123", "delete"]],
    [["users", "abc-123", "role", "x"]],
    [["students", "a", "b"]],
    [["students", ".."]],
    [["students", "a%2Fb"]],
    [["reports", "overview", "x"]],
  ])("chặn %j", (segments) => {
    expect(isAllowedProxyPath(segments)).toBe(false);
  });
});

describe("điều hướng theo vai trò", () => {
  it("Admin vào /admin/dashboard sau đăng nhập; giảng viên vào ngân hàng câu hỏi", () => {
    expect(homeFor("ADMIN")).toBe("/admin/dashboard");
    expect(homeFor("TEACHER")).toBe("/teacher/items");
  });

  it("khu /admin chỉ dành cho ADMIN", () => {
    expect(routeVerdict("/admin/dashboard", "ADMIN")).toBe("allow");
    expect(routeVerdict("/admin/users/students", "ADMIN")).toBe("allow");
    expect(routeVerdict("/admin/dashboard", "TEACHER")).toBe("forbidden");
    expect(routeVerdict("/admin/dashboard", "STUDENT")).toBe("forbidden");
    expect(routeVerdict("/admin/dashboard", null)).toBe("login");
  });

  it("Admin xem báo cáo lớp và hồ sơ sinh viên ở màn dùng chung với giảng viên (R-2)", () => {
    expect(routeVerdict("/teacher/reports", "ADMIN")).toBe("allow");
    expect(routeVerdict("/teacher/students", "ADMIN")).toBe("allow");
  });
});

describe("endpoints khu Admin", () => {
  it("tạo đúng đường dẫn", () => {
    expect(endpoints.overview()).toBe("/reports/overview");
    expect(endpoints.accounts("STUDENT")).toBe("/students");
    expect(endpoints.accounts("TEACHER")).toBe("/teachers");
    expect(endpoints.account("STUDENT", "a b")).toBe("/students/a%20b");
    expect(endpoints.accountAction("u-1", "lock")).toBe("/users/u-1/lock");
    expect(endpoints.accountAction("u-1", "role")).toBe("/users/u-1/role");
  });

  it("bỏ tham số rỗng khi dựng query (examRoundId trống = toàn hệ thống)", () => {
    expect(buildUrl("/reports/overview", { examRoundId: "" })).toBe("/reports/overview");
    expect(buildUrl("/students", { q: "sv", page: 2, pageSize: 20 })).toBe(
      "/students?q=sv&page=2&pageSize=20",
    );
  });
});

describe("tính toán hiển thị tổng quan", () => {
  it("phần trăm và định dạng số kiểu Việt Nam", () => {
    expect(percentOf(456, 1240)).toBeCloseTo(36.774, 2);
    expect(percentOf(5, 0)).toBe(0);
    expect(formatPercent(36.774)).toBe("36,8%");
    expect(formatPercent(0)).toBe("0,0%");
    expect(formatCount(1240)).toBe("1.240");
  });
});

describe("nhãn và màu theo enum", () => {
  it("nhãn CEFR đúng bảng chuẩn hóa (Pre-A1 … C1+)", () => {
    expect(CEFR_LEVELS.map((l) => vi.cefrLevel[l])).toEqual([
      "Pre-A1",
      "A1",
      "A2",
      "B1",
      "B2",
      "C1+",
    ]);
  });

  it("nhãn 6 trạng thái câu theo từ điển UI", () => {
    expect(vi.itemStatus.DRAFT).toBe("Chờ duyệt vòng 1");
    expect(vi.itemStatus.FINAL_APPROVED).toBe("Đã vào ngân hàng");
    expect(vi.itemStatus.AI_REJECTED).toBe("AI đã loại");
  });

  it("mọi giá trị enum đều có màu", () => {
    for (const level of CEFR_LEVELS) expect(CEFR_COLORS[level].bg).toMatch(/^#[0-9A-F]{6}$/i);
    for (const status of ITEM_STATUSES)
      expect(ITEM_STATUS_COLORS[status].bg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(Object.keys(CEFR_COLORS)).toHaveLength(6);
    expect(Object.keys(ITEM_STATUS_COLORS)).toHaveLength(6);
  });
});

describe("proxy-policy: import tài khoản bằng file (S19)", () => {
  const ROW = "3f2b8a52-6c1d-4f8e-9a57-1b2c3d4e5f60";
  it.each([
    [["users", "import", "upload"]],
    [["users", "import", "grid"]],
    [["users", "import", "grid", ROW]],
    [["users", "import", "save"]],
    [["users", "import", "save-status"]],
    [["users", "import", "template"]],
  ])("cho phép %j", (segments) => {
    expect(isAllowedProxyPath(segments)).toBe(true);
  });

  it.each([
    [["users", "import"]],
    [["users", "import", "evil"]],
    [["users", "import", "grid", "a", "b"]],
    [["users", "import", "grid", ".."]],
    [["users", "import", "grid", "a%2Fb"]],
    [["users", "import", "upload", "x"]],
  ])("chặn %j", (segments) => {
    expect(isAllowedProxyPath(segments)).toBe(false);
  });

  it("endpoints import tạo đúng đường dẫn", () => {
    expect(endpoints.importUpload()).toBe("/users/import/upload");
    expect(endpoints.importGrid()).toBe("/users/import/grid");
    expect(endpoints.importRow("a b")).toBe("/users/import/grid/a%20b");
    expect(endpoints.importSave()).toBe("/users/import/save");
    expect(endpoints.importStatus()).toBe("/users/import/save-status");
    expect(endpoints.importTemplate()).toBe("/users/import/template");
  });
});
