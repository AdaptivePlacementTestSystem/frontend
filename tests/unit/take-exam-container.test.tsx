import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TakeExamContainer } from "@/features/exam/take-exam-container";
import * as endpoints from "@/lib/api/endpoints";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/exam/exam-runner", () => ({
  ExamRunner: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="exam-runner-mock">ExamRunner for {sessionId}</div>
  ),
}));

describe("TakeExamContainer Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("render ExamRunner khi có phiên IN_PROGRESS gắn với roundId", async () => {
    vi.spyOn(endpoints, "getCurrentRoundSession").mockResolvedValue({
      status: "IN_PROGRESS",
      sessionId: "sess-active-123",
      examRoundId: "round-1",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TakeExamContainer roundId="round-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exam-runner-mock")).toBeInTheDocument();
      expect(screen.getByText("ExamRunner for sess-active-123")).toBeInTheDocument();
    });
  });

  it("tự động redirect sang S05 /results/:id nếu phiên thi đã COMPLETED", async () => {
    vi.spyOn(endpoints, "getCurrentRoundSession").mockResolvedValue({
      status: "COMPLETED",
      sessionId: "sess-done-456",
      examRoundId: "round-1",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TakeExamContainer roundId="round-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/results/sess-done-456");
    });
  });

  it("tự động redirect về S03 /exams/:roundId nếu trạng thái là NOT_STARTED", async () => {
    vi.spyOn(endpoints, "getCurrentRoundSession").mockResolvedValue({
      status: "NOT_STARTED",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TakeExamContainer roundId="round-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/exams/round-1");
    });
  });
});
