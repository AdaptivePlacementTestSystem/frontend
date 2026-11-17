import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExamRunner } from "@/features/exam/exam-runner";
import * as endpoints from "@/lib/api/endpoints";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("S04 - ExamRunner Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(endpoints, "getNextItem").mockResolvedValue({
      kind: "item",
      session: {
        id: "sess-cat-1",
        itemCount: 3,
        maxItems: 25,
        expiresAt: new Date(Date.now() + 1800_000).toISOString(),
        serverTime: new Date().toISOString(),
      },
      item: {
        id: "item-vocab-1",
        content: "She had a significant _______ on the team.",
        options: {
          A: "impact",
          B: "affect",
          C: "effecting",
          D: "resulted",
        },
        skill: "VOCABULARY",
      },
    });
  });

  it("hiển thị số câu, chip kỹ năng, đồng hồ và nội dung câu hỏi", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExamRunner sessionId="sess-cat-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("question-index")).toHaveTextContent("Câu 4");
    });

    expect(screen.getByTestId("question-skill")).toHaveTextContent("Từ vựng");
    expect(screen.getByTestId("timer")).toBeInTheDocument();
    expect(screen.getByTestId("question-content")).toHaveTextContent(
      "She had a significant _______ on the team.",
    );

    expect(screen.getByTestId("option-A")).toBeInTheDocument();
    expect(screen.getByTestId("option-B")).toBeInTheDocument();
    expect(screen.getByTestId("option-C")).toBeInTheDocument();
    expect(screen.getByTestId("option-D")).toBeInTheDocument();
  });

  it("nút nộp đáp án bị vô hiệu khi chưa chọn, và bật lên khi đã chọn đáp án", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExamRunner sessionId="sess-cat-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("submit-answer")).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-answer");
    expect(submitBtn).toBeDisabled();

    // Chọn phương án A
    fireEvent.click(screen.getByTestId("option-A"));

    expect(submitBtn).toBeEnabled();
  });

  it("gửi đáp án đúng định dạng khi bấm nộp bài", async () => {
    const submitSpy = vi.spyOn(endpoints, "submitResponse").mockResolvedValue({
      accepted: true,
      shouldStop: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExamRunner sessionId="sess-cat-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("option-B")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("option-B"));
    fireEvent.click(screen.getByTestId("submit-answer"));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        "sess-cat-1",
        expect.objectContaining({
          itemId: "item-vocab-1",
          response: "B",
        }),
      );
    });
  });
});
