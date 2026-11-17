import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudentHome } from "@/features/exam/student-home";
import * as endpoints from "@/lib/api/endpoints";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("S02 - StudentHome Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("hiển thị banner làm tiếp bài thi dở dang khi có active session", async () => {
    vi.spyOn(endpoints, "getActiveSession").mockResolvedValue({
      session: {
        sessionId: "sess-inprogress-1",
        itemCount: 7,
        maxItems: 25,
        expiresAt: new Date(Date.now() + 1800_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
    });

    vi.spyOn(endpoints, "getStudentExamRounds").mockResolvedValue([
      {
        id: "round-1",
        title: "Kỳ thi xếp lớp đợt 1",
        opensAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + 86400_000).toISOString(),
        durationMinutes: 45,
        status: "OPEN",
        effectiveStatus: "OPEN",
        sessionStatus: "IN_PROGRESS",
        sessionId: "sess-inprogress-1",
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <StudentHome />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("resume-banner")).toBeInTheDocument();
    });

    expect(screen.getByText(/Đã hoàn thành 7 \/ 25 câu/)).toBeInTheDocument();
    expect(screen.getByTestId("resume-banner-button")).toBeInTheDocument();
  });

  it("hiển thị danh sách các kỳ thi của tôi (my-rounds) với đầy đủ thông tin", async () => {
    vi.spyOn(endpoints, "getActiveSession").mockResolvedValue({
      session: null,
    });

    vi.spyOn(endpoints, "getStudentExamRounds").mockResolvedValue([
      {
        id: "round-1",
        title: "Kỳ thi phân lớp tiếng Anh K2026",
        opensAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + 86400_000).toISOString(),
        durationMinutes: 45,
        status: "OPEN",
        effectiveStatus: "OPEN",
        sessionStatus: "NOT_STARTED",
      },
      {
        id: "round-2",
        title: "Khảo sát năng lực định kỳ",
        opensAt: new Date().toISOString(),
        closesAt: new Date(Date.now() + 86400_000).toISOString(),
        durationMinutes: 45,
        status: "OPEN",
        effectiveStatus: "OPEN",
        sessionStatus: "COMPLETED",
        sessionId: "sess-done-2",
        scoreCefr: "B1",
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <StudentHome />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("my-rounds")).toBeInTheDocument();
    });

    expect(screen.getByText("Kỳ thi phân lớp tiếng Anh K2026")).toBeInTheDocument();
    expect(screen.getByTestId("start-exam")).toBeInTheDocument();

    expect(screen.getByText("Khảo sát năng lực định kỳ")).toBeInTheDocument();
    expect(screen.getByTestId("view-result")).toBeInTheDocument();
  });
});
