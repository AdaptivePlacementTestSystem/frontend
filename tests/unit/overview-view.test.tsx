import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OverviewView } from "@/features/admin-overview/overview-view";
import { ApiError } from "@/lib/api/errors";
import type { SystemOverview } from "@/lib/api/types";
import { buildOverview, MOCK_ROUND_ID } from "@/mocks/admin-handlers";

const getSystemOverview = vi.fn();
vi.mock("@/lib/api/endpoints", () => ({
  getSystemOverview: (...args: unknown[]) => getSystemOverview(...args),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const NOW = new Date("2026-11-14T10:00:00Z").getTime();

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OverviewView />
    </QueryClientProvider>,
  );
}

const data = (override: Partial<SystemOverview> = {}): SystemOverview => ({
  ...buildOverview(NOW, null),
  ...override,
});

describe("OverviewView (S36)", () => {
  beforeEach(() => {
    getSystemOverview.mockReset();
    getSystemOverview.mockResolvedValue(data());
  });

  it("hiện 4 thẻ số với số liệu từ API", async () => {
    renderView();

    expect(await screen.findByTestId("stat-students-value")).toHaveTextContent("1.240");
    expect(screen.getByTestId("stat-final-approved-value")).toHaveTextContent("486");
    expect(screen.getByTestId("stat-batches-open-value")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-open-rounds-value")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-final-approved")).toHaveTextContent(
      "Đã vào ngân hàng chính thức",
    );
  });

  it("thẻ lô và kỳ thi có liên kết sang màn quản lý", async () => {
    renderView();
    await screen.findByTestId("stat-students");

    expect(
      within(screen.getByTestId("stat-batches-open")).getByRole("link", {
        name: /Xem các lô câu hỏi/,
      }),
    ).toHaveAttribute("href", "/admin/item-batches");
    expect(
      within(screen.getByTestId("stat-open-rounds")).getByRole("link", { name: /Xem các kỳ thi/ }),
    ).toHaveAttribute("href", "/admin/exam-rounds");
  });

  it("phân phối CEFR: đủ 6 thanh với nhãn chuẩn hóa và tỷ lệ", async () => {
    renderView();
    const card = await screen.findByTestId("cefr-distribution");

    for (const label of ["Pre-A1", "A1", "A2", "B1", "B2", "C1+"]) {
      expect(within(card).getByText(label)).toBeInTheDocument();
    }
    expect(within(card).getAllByRole("progressbar")).toHaveLength(6);
    expect(within(screen.getByTestId("cefr-row-B2")).getByText(/311/)).toBeInTheDocument();
    expect(within(screen.getByTestId("cefr-row-B2")).getByText("25,1%")).toBeInTheDocument();
  });

  it("thống kê trạng thái câu: biểu đồ vòng (đúng Stitch) kèm 6 dòng chú giải và tổng", async () => {
    renderView();
    const card = await screen.findByTestId("item-status-distribution");

    expect(within(card).getByRole("img")).toBeInTheDocument();
    expect(within(card).getAllByRole("listitem")).toHaveLength(6);
    expect(within(card).getByText("Chờ duyệt vòng 1")).toBeInTheDocument();
    expect(within(card).getByText("AI đã loại")).toBeInTheDocument();
    expect(within(card).getByText("Tổng 693 câu")).toBeInTheDocument();
  });

  it("chuyển Biểu đồ ⇄ Bảng số liệu ở từng khối", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByTestId("cefr-distribution");

    await user.click(screen.getByTestId("cefr-view-table"));

    const table = screen.getByTestId("cefr-table");
    expect(within(table).getAllByRole("row")).toHaveLength(7); // tiêu đề + 6 mức
    expect(screen.queryByTestId("cefr-row-B1")).not.toBeInTheDocument();
    // khối kia không bị đổi theo
    expect(screen.getByTestId("item-status-row-DRAFT")).toBeInTheDocument();

    await user.click(screen.getByTestId("cefr-view-chart"));
    expect(screen.getByTestId("cefr-row-B1")).toBeInTheDocument();
  });

  it("không có sinh viên nào hoàn thành: báo rỗng thay biểu đồ CEFR", async () => {
    const zeroCefr = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1_PLUS: 0 };
    getSystemOverview.mockResolvedValue(data({ studentsCompleted: 0, cefrDistribution: zeroCefr }));
    renderView();

    expect(await screen.findByTestId("cefr-empty")).toHaveTextContent(
      "Chưa có sinh viên nào hoàn thành bài thi.",
    );
  });

  it("bảng kỳ thi đang mở: tên, thời lượng, ba số sinh viên, liên kết quản lý", async () => {
    renderView();
    const row = await screen.findByTestId(`open-round-${MOCK_ROUND_ID}`);

    expect(row).toHaveTextContent("Kỳ thi xếp lớp tân sinh viên 2026");
    expect(row).toHaveTextContent("45 phút");
    expect(row).toHaveTextContent("400 chưa thi · 142 đang thi · 118 hoàn thành");
    expect(within(row).getByRole("link", { name: "Vào quản lý kỳ thi" })).toHaveAttribute(
      "href",
      `/admin/exam-rounds/${MOCK_ROUND_ID}`,
    );
  });

  it("không có kỳ nào đang mở: báo rỗng", async () => {
    getSystemOverview.mockResolvedValue(data({ openRounds: [], openExamRounds: 0 }));
    renderView();

    expect(await screen.findByText("Hiện không có kỳ thi nào đang mở.")).toBeInTheDocument();
  });

  it("lọc theo kỳ thi: gửi examRoundId; chọn lại 'Tất cả' bỏ lọc", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByTestId("stat-students");
    expect(getSystemOverview).toHaveBeenLastCalledWith(undefined, expect.anything());

    await user.selectOptions(screen.getByTestId("round-filter"), MOCK_ROUND_ID);
    await waitFor(() =>
      expect(getSystemOverview).toHaveBeenLastCalledWith(MOCK_ROUND_ID, expect.anything()),
    );

    await user.selectOptions(screen.getByTestId("round-filter"), "");
    await waitFor(() =>
      expect(getSystemOverview).toHaveBeenLastCalledWith(undefined, expect.anything()),
    );
  });

  it("nút Làm mới gọi lại API (không tự cập nhật theo chu kỳ)", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByTestId("stat-students");
    const before = getSystemOverview.mock.calls.length;

    await user.click(screen.getByTestId("overview-refresh"));

    await waitFor(() => expect(getSystemOverview.mock.calls.length).toBeGreaterThan(before));
  });

  it("lỗi tải: hiện thông báo và cho thử lại", async () => {
    getSystemOverview.mockRejectedValueOnce(new ApiError(500, "UNKNOWN", "x"));
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByTestId("stat-students")).toBeInTheDocument();
  });
});
