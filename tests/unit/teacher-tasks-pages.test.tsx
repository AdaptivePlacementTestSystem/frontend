import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReviewTasksPage from "@/app/(teacher)/teacher/tasks/reviews/page";
import ConfirmTasksPage from "@/app/(teacher)/teacher/tasks/confirms/page";
import * as endpoints from "@/lib/api/endpoints";

vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher/tasks/reviews",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

describe("S33 - ReviewTasksPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders empty state when no batches are assigned", async () => {
    vi.spyOn(endpoints, "getTeacherReviewTasks").mockResolvedValue({
      batches: [],
      stats: { pendingReviews: 0, pendingConfirms: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReviewTasksPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Bạn chưa có câu nào cần duyệt.")).toBeInTheDocument();
    });
  });

  it("renders review batches with progress and open batch button", async () => {
    vi.spyOn(endpoints, "getTeacherReviewTasks").mockResolvedValue({
      batches: [
        {
          batchId: "batch-101",
          batchName: "Lô Từ vựng B1 - đợt 1",
          totalAssigned: 20,
          decidedCount: 12,
          pendingCount: 8,
          dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          isOverdue: false,
        },
      ],
      stats: { pendingReviews: 8, pendingConfirms: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReviewTasksPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("inbox-review-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Lô Từ vựng B1 - đợt 1")).toBeInTheDocument();
    expect(screen.getByText(/Đã quyết 12 \/ 20/i)).toBeInTheDocument();
    expect(screen.getByTestId("open-batch-batch-101")).toBeInTheDocument();
  });
});

describe("S34 - ConfirmTasksPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders empty state when no confirm tasks exist", async () => {
    vi.spyOn(endpoints, "getTeacherConfirmTasks").mockResolvedValue({
      batches: [],
      stats: { pendingReviews: 0, pendingConfirms: 0 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ConfirmTasksPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Bạn chưa có câu nào cần xác nhận.")).toBeInTheDocument();
    });
  });

  it("renders confirm batch card with counts", async () => {
    vi.spyOn(endpoints, "getTeacherConfirmTasks").mockResolvedValue({
      batches: [
        {
          batchId: "batch-202",
          batchName: "Lô Ngữ pháp B2 - thẩm định",
          totalAssigned: 15,
          pendingCount: 3,
          confirmedCount: 10,
          removedCount: 2,
          decidedCount: 12,
          dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          isOverdue: false,
        },
      ],
      stats: { pendingReviews: 0, pendingConfirms: 3 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ConfirmTasksPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("inbox-confirm-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Lô Ngữ pháp B2 - thẩm định")).toBeInTheDocument();
    expect(screen.getByText(/Đã xác nhận: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã loại: 2/i)).toBeInTheDocument();
    expect(screen.getByTestId("open-confirm-batch-batch-202")).toBeInTheDocument();
  });
});
