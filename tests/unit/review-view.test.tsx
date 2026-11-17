import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewView } from "@/features/result/review-view";
import * as endpoints from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";

describe("S06 - ReviewView Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("hiển thị danh sách câu hỏi, đánh dấu 'Bạn đã chọn' và 'Đáp án đúng', cùng giải thích AI", async () => {
    vi.spyOn(endpoints, "getReview").mockResolvedValue([
      {
        order: 1,
        content: "She had a significant _______ on the team.",
        options: {
          A: "impact",
          B: "affect",
          C: "effecting",
          D: "resulted",
        },
        chosen: "B",
        correct: "A",
        isCorrect: false,
        skill: "VOCABULARY",
        explanation: {
          v: 1,
          general: "Cụm từ cố định 'have an impact on' nghĩa là có tác động đến.",
          options: {
            A: "Đáp án đúng theo ngữ cảnh.",
            B: "Affect là động từ, không đứng sau tính từ significant.",
          },
        },
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <ReviewView sessionId="sess-rev-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("review-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("chosen-mark")).toHaveTextContent("Bạn đã chọn");
    expect(screen.getByTestId("correct-mark")).toHaveTextContent("Đáp án đúng");
    expect(screen.getByTestId("explanation-general")).toHaveTextContent("have an impact on");
  });

  it("hiển thị thông báo khi tính năng xem lại bị khóa (REVIEW_DISABLED)", async () => {
    vi.spyOn(endpoints, "getReview").mockRejectedValue(
      new ApiError(403, "REVIEW_DISABLED", "Xem lại đáp án đang tạm đóng"),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ReviewView sessionId="sess-rev-disabled" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-disabled")).toBeInTheDocument();
    });
  });
});
