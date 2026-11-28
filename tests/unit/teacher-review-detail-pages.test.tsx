import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BatchReviewPage from "@/app/(teacher)/teacher/tasks/reviews/[batchId]/page";
import BatchConfirmPage from "@/app/(teacher)/teacher/tasks/confirms/[batchId]/page";
import * as endpoints from "@/lib/api/endpoints";

type BatchReviewItems = Awaited<ReturnType<typeof endpoints.getBatchItemsForReview>>["items"];
type BatchConfirmItems = Awaited<ReturnType<typeof endpoints.getBatchItemsForConfirm>>["items"];

vi.mock("next/navigation", () => ({
  useParams: () => ({ batchId: "batch-101" }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("S11 - BatchReviewPage (GV vai A)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const mockReviewItems: BatchReviewItems = [
    {
      id: "item-1",
      content: "What is the capital of Vietnam?",
      options: { A: "Hanoi", B: "HCM", C: "Danang", D: "Hue" },
      correctAnswer: "A",
      explanation: "Hanoi is the capital.",
      skill: "VOCABULARY",
      cefrTarget: "A1",
      topicTag: "General",
      irtB: -1.2,
      status: "DRAFT",
      hasEdited: false,
      flags: [],
      firstReview: {
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        action: null,
        reviewedAt: null,
        comment: null,
        originalSnapshot: null,
      },
    },
    {
      id: "item-2",
      content: "Second question content here",
      options: { A: "One", B: "Two", C: "Three", D: "Four" },
      correctAnswer: "B",
      explanation: "Two is correct.",
      skill: "GRAMMAR",
      cefrTarget: "B1",
      topicTag: "Tenses",
      irtB: 0.5,
      status: "FIRST_APPROVED",
      hasEdited: true,
      flags: [],
      firstReview: {
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        action: "APPROVE",
        reviewedAt: new Date().toISOString(),
        comment: null,
        originalSnapshot: {
          content: "Original second question",
          options: { A: "One", B: "Two", C: "Three", D: "Four" },
          correctAnswer: "B",
          explanation: "Old explanation",
        },
      },
    },
  ];

  it("renders item list and details of current item", async () => {
    vi.spyOn(endpoints, "getBatchItemsForReview").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockReviewItems.length,
      decidedCount: 1,
      items: mockReviewItems,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchReviewPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-progress")).toBeInTheDocument();
    });

    expect(screen.getByTestId("review-content")).toHaveValue("What is the capital of Vietnam?");
    expect(screen.getByTestId("review-approve")).toBeInTheDocument();
    expect(screen.getByTestId("review-reject")).toBeInTheDocument();
  });

  it("calls approveTeacherItem when Duyệt button is clicked", async () => {
    vi.spyOn(endpoints, "getBatchItemsForReview").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockReviewItems.length,
      decidedCount: 1,
      items: mockReviewItems,
    });
    const approveSpy = vi.spyOn(endpoints, "approveTeacherItem").mockResolvedValue({
      success: true,
      itemId: "item-1",
      status: "FIRST_APPROVED",
      batchFinalized: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchReviewPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-approve")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("review-approve"));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith("item-1");
    });
  });

  it("opens reject confirmation dialog, requires trimmed comment, and calls rejectTeacherItem", async () => {
    vi.spyOn(endpoints, "getBatchItemsForReview").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockReviewItems.length,
      decidedCount: 1,
      items: mockReviewItems,
    });
    const rejectSpy = vi.spyOn(endpoints, "rejectTeacherItem").mockResolvedValue({
      success: true,
      itemId: "item-1",
      status: "REJECTED",
      batchFinalized: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchReviewPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-reject")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("review-reject"));

    // Check dialog opens and confirm button is disabled when comment is empty/whitespace
    expect(screen.getByText("Từ chối câu hỏi này?")).toBeInTheDocument();
    const targetRejectBtn = screen.getByTestId("confirm-reject-submit");
    expect(targetRejectBtn).toBeDisabled();

    fireEvent.change(screen.getByTestId("reject-comment-input"), {
      target: { value: "   " },
    });
    expect(targetRejectBtn).toBeDisabled();

    fireEvent.change(screen.getByTestId("reject-comment-input"), {
      target: { value: "  Câu hỏi sai kiến thức  " },
    });
    expect(targetRejectBtn).toBeEnabled();
    fireEvent.click(targetRejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith("item-1", "Câu hỏi sai kiến thức");
    });
  });
});

describe("S35 - BatchConfirmPage (GV vai B)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const mockConfirmItems: BatchConfirmItems = [
    {
      id: "item-1",
      content: "What is the capital of Vietnam?",
      options: { A: "Hanoi", B: "HCM", C: "Danang", D: "Hue" },
      correctAnswer: "A",
      explanation: "Hanoi is the capital.",
      skill: "VOCABULARY",
      cefrTarget: "A1",
      topicTag: "General",
      irtB: -1.2,
      status: "FIRST_APPROVED",
      hasEdited: true,
      flags: [],
      firstReview: {
        dueAt: new Date().toISOString(),
        action: "APPROVE",
        reviewedAt: new Date().toISOString(),
        comment: null,
        originalSnapshot: {
          content: "Original capital question?",
          options: { A: "Hanoi", B: "HCM", C: "Danang", D: "Hue" },
          correctAnswer: "A",
          explanation: "Old exp",
        },
      },
      secondReview: {
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        action: null,
        confirmedAt: null,
        comment: null,
      },
      reviewerName: "GV Nguyễn Văn A",
    },
  ];

  it("renders confirm page with reviewer name, tag 'A đã sửa', and confirm buttons", async () => {
    vi.spyOn(endpoints, "getBatchItemsForConfirm").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockConfirmItems.length,
      decidedCount: 0,
      items: mockConfirmItems,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchConfirmPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("confirm-header")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/A đã sửa/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GV Nguyễn Văn A/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("confirm-all")).toBeInTheDocument();
  });

  it("calls confirmTeacherItem when Xác nhận is clicked", async () => {
    vi.spyOn(endpoints, "getBatchItemsForConfirm").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockConfirmItems.length,
      decidedCount: 0,
      items: mockConfirmItems,
    });
    const confirmSpy = vi.spyOn(endpoints, "confirmTeacherItem").mockResolvedValue({
      success: true,
      itemId: "item-1",
      status: "SECOND_APPROVED",
      batchFinalized: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchConfirmPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("confirm-item-item-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-item-item-1"));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("item-1");
    });
  });

  it("calls confirmAllRemainingItems when Xác nhận tất cả is confirmed in dialog", async () => {
    vi.spyOn(endpoints, "getBatchItemsForConfirm").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockConfirmItems.length,
      decidedCount: 0,
      items: mockConfirmItems,
    });
    const confirmAllSpy = vi.spyOn(endpoints, "confirmAllRemainingItems").mockResolvedValue({
      success: true,
      confirmedCount: 1,
      batchFinalized: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchConfirmPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("confirm-all")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-all"));

    expect(screen.getByText("Xác nhận tất cả câu còn lại trong lô?")).toBeInTheDocument();

    const dialogButtons = screen.getAllByRole("button", { name: /Xác nhận tất cả/i });
    const targetConfirmAllBtn = dialogButtons[dialogButtons.length - 1];
    expect(targetConfirmAllBtn).toBeDefined();
    if (targetConfirmAllBtn) fireEvent.click(targetConfirmAllBtn);

    await waitFor(() => {
      expect(confirmAllSpy).toHaveBeenCalledWith("batch-101");
    });
  });

  it("opens remove dialog, requires trimmed comment, and calls removeTeacherItem (WP-7.3)", async () => {
    vi.spyOn(endpoints, "getBatchItemsForConfirm").mockResolvedValue({
      batchId: "batch-101",
      batchName: "Lô A1",
      totalCount: mockConfirmItems.length,
      decidedCount: 0,
      items: mockConfirmItems,
    });
    const removeSpy = vi.spyOn(endpoints, "removeTeacherItem").mockResolvedValue({
      success: true,
      itemId: "item-1",
      status: "REJECTED",
      batchFinalized: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BatchConfirmPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("remove-item-item-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("remove-item-item-1"));
    expect(screen.getByText("Loại bỏ câu hỏi này?")).toBeInTheDocument();

    const submitRemoveBtn = screen.getByTestId("confirm-remove-submit");
    expect(submitRemoveBtn).toBeDisabled();

    fireEvent.change(screen.getByTestId("remove-comment-input"), {
      target: { value: "  Đáp án nhiễu gây hiểu nhầm  " },
    });
    expect(submitRemoveBtn).toBeEnabled();
    fireEvent.click(submitRemoveBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith("item-1", "Đáp án nhiễu gây hiểu nhầm");
    });
  });
});
