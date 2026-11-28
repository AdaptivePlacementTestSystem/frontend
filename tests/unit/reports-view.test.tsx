import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsView } from "@/features/reports/reports-view";
import { ApiError } from "@/lib/api/errors";

const api = vi.hoisted(() => ({
  getClassDistribution: vi.fn(),
  getClassErrorPatterns: vi.fn(),
  downloadCsv: vi.fn(),
}));
vi.mock("@/lib/api/endpoints", () => api);
vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn().mockResolvedValue([{ id: "round-1", name: "Kỳ 1" }]),
}));
// Biểu đồ recharts cần kích thước thật; ở jsdom chỉ cần khung bao
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Box,
    BarChart: Box,
    Bar: Box,
    CartesianGrid: Box,
    Tooltip: Box,
    XAxis: Box,
    YAxis: Box,
  };
});

// Đúng dạng backend thật trả (ClassReportEntity)
const backendReport = {
  examRoundId: null,
  totalStudents: 36,
  cefrDistribution: { PRE_A1: 1, A1: 6, A2: 14, B1: 11, B2: 4, C1_PLUS: 0 },
  averageTheta: 0.12,
  generatedAt: "2026-11-14T08:00:00.000Z",
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReportsView />
    </QueryClientProvider>,
  );
}

describe("ReportsView với dữ liệu backend thật", () => {
  beforeEach(() => {
    api.getClassDistribution.mockReset();
    api.getClassErrorPatterns.mockReset();
  });

  it("đọc cefrDistribution/totalStudents, không vỡ trang", async () => {
    api.getClassDistribution.mockResolvedValue(backendReport);
    api.getClassErrorPatterns.mockResolvedValue([]);

    renderView();

    expect(await screen.findByTestId("report-total")).toHaveTextContent("36");
  });

  it("hiển thị lỗi khi không tải được thống kê", async () => {
    api.getClassDistribution.mockResolvedValue(backendReport);
    api.getClassErrorPatterns.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Cannot GET"));

    renderView();

    await screen.findByTestId("report-total");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("lọc cả hai báo cáo theo kỳ được chọn", async () => {
    api.getClassDistribution.mockResolvedValue(backendReport);
    api.getClassErrorPatterns.mockResolvedValue([]);
    renderView();
    await screen.findByRole("option", { name: "Kỳ 1" });
    fireEvent.change(screen.getByLabelText("Kỳ thi"), { target: { value: "round-1" } });
    await waitFor(() => {
      expect(api.getClassDistribution).toHaveBeenLastCalledWith("round-1", expect.any(AbortSignal));
      expect(api.getClassErrorPatterns).toHaveBeenLastCalledWith(
        "round-1",
        expect.any(AbortSignal),
      );
    });
  });

  it("chưa có sinh viên nào: hiện trạng thái rỗng", async () => {
    api.getClassDistribution.mockResolvedValue({
      ...backendReport,
      totalStudents: 0,
      cefrDistribution: { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1_PLUS: 0 },
    });
    api.getClassErrorPatterns.mockResolvedValue([]);

    renderView();

    expect(await screen.findAllByText(/chưa có|không có/i)).not.toHaveLength(0);
    expect(screen.queryByTestId("report-total")).not.toBeInTheDocument();
  });
});
