import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsView } from "@/features/reports/reports-view";
import { ApiError } from "@/lib/api/errors";

const api = vi.hoisted(() => ({
  getClassDistribution: vi.fn(),
  getClassErrorPatterns: vi.fn(),
  listExamRounds: vi.fn(),
  downloadCsv: vi.fn(),
}));
vi.mock("@/lib/api/endpoints", () => api);

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

const backendReport = {
  examRoundId: null,
  totalStudents: 36,
  cefrDistribution: { PRE_A1: 1, A1: 6, A2: 14, B1: 11, B2: 4, C1_PLUS: 0 },
  averageTheta: 0.12,
  generatedAt: "2026-11-14T08:00:00.000Z",
};

const mockExamRounds = [
  { id: "round-1", name: "Kỳ thi Xếp lớp Đợt 1", status: "OPEN" },
  { id: "round-2", name: "Kỳ thi Xếp lớp Đợt 2", status: "CLOSED" },
];

const mockErrorPatterns = [
  {
    topicTag: "relative_clauses",
    skill: "GRAMMAR",
    incorrectCount: 15,
    totalCount: 20,
    studentCount: 12,
    errorRate: 75,
  },
  {
    topicTag: "academic_vocabulary",
    skill: "VOCABULARY",
    incorrectCount: 10,
    totalCount: 25,
    studentCount: 8,
    errorRate: 40,
  },
];

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
    api.listExamRounds.mockReset();
    api.downloadCsv.mockReset();

    api.listExamRounds.mockResolvedValue(mockExamRounds);
    api.getClassDistribution.mockResolvedValue(backendReport);
    api.getClassErrorPatterns.mockResolvedValue(mockErrorPatterns);
    api.downloadCsv.mockResolvedValue({
      blob: new Blob(["test"], { type: "text/csv" }),
      filename: "test.csv",
    });
  });

  it("đọc cefrDistribution/totalStudents, không vỡ trang", async () => {
    renderView();

    expect(await screen.findByTestId("report-total")).toHaveTextContent("36");
    expect(screen.getByTestId("stat-completed")).toBeInTheDocument();
    expect(screen.getByTestId("cefr-distribution")).toBeInTheDocument();
  });

  it("backend chưa có error-patterns (404): coi như chưa có dữ liệu, không hiện lỗi", async () => {
    api.getClassErrorPatterns.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Cannot GET"));

    renderView();

    await screen.findByTestId("report-total");
    expect(screen.queryByText(/Cannot GET/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("chuyển đổi chế độ xem Biểu đồ | Bảng", async () => {
    renderView();

    await screen.findByTestId("report-total");
    const tableBtn = screen.getByTestId("view-table");
    fireEvent.click(tableBtn);

    // Bảng phân phối hiển thị các mức CEFR
    expect(screen.getByText("TỈ LỆ CHIẾM")).toBeInTheDocument();
    expect(screen.getByText("Pre-A1")).toBeInTheDocument();

    const chartBtn = screen.getByTestId("view-chart");
    fireEvent.click(chartBtn);
  });

  it("bộ lọc kỳ thi (filter-round) gửi examRoundId đến API", async () => {
    renderView();

    // Chờ danh sách kỳ thi được load vào dropdown
    await screen.findByText("Kỳ thi Xếp lớp Đợt 1");

    const select = screen.getByTestId("filter-round");
    fireEvent.change(select, { target: { value: "round-1" } });

    await waitFor(() => {
      expect(api.getClassDistribution).toHaveBeenCalledWith("round-1", expect.anything());
    });
  });

  it("bấm nút Xuất CSV gọi downloadCsv", async () => {
    renderView();

    await screen.findByTestId("export-csv");
    const exportBtn = screen.getByTestId("export-csv");
    fireEvent.click(exportBtn);

    const profilesOption = screen.getByTestId("export-profiles");
    fireEvent.click(profilesOption);

    expect(api.downloadCsv).toHaveBeenCalledWith("profiles", undefined);
  });

  it("hiển thị bảng mô hình sai sót (error-pattern-table)", async () => {
    renderView();

    await screen.findByTestId("error-pattern-table");
    expect(screen.getByText("Mệnh đề quan hệ (Relative Clauses)")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("12 SV")).toBeInTheDocument();
  });
});
