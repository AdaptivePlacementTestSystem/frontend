import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExamIntro } from "@/features/exam/exam-intro";
import * as endpoints from "@/lib/api/endpoints";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("S03 - ExamIntro Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(endpoints, "getExamRoundDetail").mockResolvedValue({
      id: "round-cat-01",
      title: "Kỳ thi xếp lớp tiếng Anh học kỳ 1 năm 2026",
      opensAt: "2026-11-11T08:00:00Z",
      closesAt: "2026-11-11T12:00:00Z",
      durationMinutes: 45,
      status: "OPEN",
      effectiveStatus: "OPEN",
    });
  });

  it("hiển thị đầy đủ thông tin kỳ thi và 6 lưu ý quan trọng trước khi làm bài", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExamIntro roundId="round-cat-01" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Kỳ thi xếp lớp tiếng Anh học kỳ 1 năm 2026")).toBeInTheDocument();
    });

    // 6 lưu ý quan trọng
    expect(screen.getByText("1. Tính giờ làm bài")).toBeInTheDocument();
    expect(screen.getByText("2. Giờ đóng kỳ thi")).toBeInTheDocument();
    expect(screen.getByText("3. Đề thi thích ứng")).toBeInTheDocument();
    expect(screen.getByText("4. Không thể quay lại")).toBeInTheDocument();
    expect(screen.getByText("5. Bảo mật kết quả")).toBeInTheDocument();
    expect(screen.getByText("6. Kết thúc sớm")).toBeInTheDocument();

    expect(screen.getByTestId("confirm-start")).toBeInTheDocument();
    expect(screen.getByTestId("intro-back")).toBeInTheDocument();
  });

  it("gọi startSession khi nhấn nút xác nhận bắt đầu làm bài", async () => {
    const startSpy = vi
      .spyOn(endpoints, "startSession")
      .mockResolvedValue({ sessionId: "sess-created-999" });

    render(
      <QueryClientProvider client={queryClient}>
        <ExamIntro roundId="round-cat-01" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("confirm-start")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-start"));

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith("round-cat-01");
    });
  });
});
