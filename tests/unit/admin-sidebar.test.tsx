import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { CurrentUser } from "@/lib/api/types";
import { buildOverview } from "@/mocks/admin-handlers";

const getSystemOverview = vi.fn();
vi.mock("@/lib/api/endpoints", () => ({
  getSystemOverview: (...args: unknown[]) => getSystemOverview(...args),
}));
const nav = vi.hoisted(() => ({ pathname: "/admin/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const admin: CurrentUser = {
  id: "u-ad1",
  email: "admin@example.test",
  fullName: "Quản trị Hệ thống",
  role: "ADMIN",
  studentCode: null,
};

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminSidebar user={admin} />
    </QueryClientProvider>,
  );
}

describe("AdminSidebar (L-SIDEBAR)", () => {
  beforeEach(() => {
    nav.pathname = "/admin/dashboard";
    getSystemOverview.mockReset();
    getSystemOverview.mockResolvedValue(buildOverview(Date.now(), null));
  });

  it("có đủ 7 mục Admin theo đúng thứ tự và route", () => {
    renderSidebar();
    const links = screen.getAllByRole("link");

    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Tổng quan", "/admin/dashboard"],
      ["Ngân hàng câu hỏi", "/admin/item-bank"],
      ["Lô câu hỏi", "/admin/item-batches"],
      ["Kỳ thi", "/admin/exam-rounds"],
      ["Tài khoản", "/admin/users/students"],
      ["Báo cáo lớp học", "/teacher/reports"],
      ["Hồ sơ sinh viên", "/teacher/students"],
    ]);
  });

  it("không có mục Hộp việc (Admin không làm GV A/B)", () => {
    renderSidebar();
    expect(screen.queryByText("Hộp việc")).not.toBeInTheDocument();
  });

  it("tô sáng mục hiện tại", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Kỳ thi" })).not.toHaveAttribute("aria-current");
  });

  it.each(["/admin/users/students", "/admin/users/teachers"])(
    "mục Tài khoản sáng ở cả hai tab (%s)",
    (path) => {
      nav.pathname = path;
      renderSidebar();
      expect(screen.getByRole("link", { name: "Tài khoản" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );

  it("hiện tên, huy hiệu Quản trị viên và nút đăng xuất", () => {
    renderSidebar();
    expect(screen.getByTestId("user-name")).toHaveTextContent("Quản trị Hệ thống");
    expect(screen.getByText("Quản trị viên")).toBeInTheDocument();
    expect(screen.getByTestId("logout")).toBeInTheDocument();
  });

  it("chấm vàng cạnh Lô câu hỏi khi còn lô cần xử lý", async () => {
    renderSidebar();
    expect(await screen.findByTestId("batches-dot")).toBeInTheDocument();
  });

  it("không có lô cần xử lý: không hiện chấm vàng", async () => {
    getSystemOverview.mockResolvedValue({
      ...buildOverview(Date.now(), null),
      batchesNeedingAction: 0,
    });
    renderSidebar();

    await waitFor(() => expect(getSystemOverview).toHaveBeenCalled());
    expect(screen.queryByTestId("batches-dot")).not.toBeInTheDocument();
  });
});
