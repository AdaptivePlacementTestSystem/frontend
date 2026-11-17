import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoryView } from "@/features/history/history-view";
import * as endpoints from "@/lib/api/endpoints";

describe("S07 - HistoryView Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("hiển thị bảng lịch sử bài thi với đầy đủ các trạng thái Hoàn thành, Hết giờ, Bỏ dở", async () => {
    vi.spyOn(endpoints, "getHistory").mockResolvedValue([
      {
        sessionId: "sess-hist-1",
        examRoundTitle: "Kỳ thi xếp lớp đầu khóa 2026",
        completedAt: "2026-11-10T10:30:00Z",
        itemsAdministered: 25,
        cefrLevel: "B1",
        theta: 0.28,
        standardError: 0.31,
        status: "COMPLETED",
        stoppingReason: "SE_THRESHOLD",
      },
      {
        sessionId: "sess-hist-2",
        examRoundTitle: "Khảo sát giữa kỳ",
        completedAt: "2026-10-15T09:15:00Z",
        itemsAdministered: 8,
        cefrLevel: null,
        theta: null,
        standardError: null,
        status: "ABANDONED",
        stoppingReason: "TIMEOUT",
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <HistoryView studentCode="SV2026001" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("history-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("history-row-sess-hist-1")).toBeInTheDocument();
    expect(
      screen.getAllByText("Kỳ thi xếp lớp đầu khóa 2026").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("B1").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByTestId("history-row-sess-hist-2")).toBeInTheDocument();
    expect(screen.getAllByText("Khảo sát giữa kỳ").length).toBeGreaterThanOrEqual(1);
  });

  it("hiển thị thông báo rỗng khi sinh viên chưa có bài thi nào", async () => {
    vi.spyOn(endpoints, "getHistory").mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <HistoryView studentCode="SV2026002" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Bạn chưa hoàn thành bài thi nào."),
      ).toBeInTheDocument();
    });
  });
});
