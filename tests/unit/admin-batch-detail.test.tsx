import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BatchDetailView } from "@/features/admin-item-batches/batch-detail";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isLoading: false,
    error: null,
    data: {
      batch: {
        id: "batch-1",
        name: "Lô thử",
        source: "AI_GENERATED",
        status: "IN_REVIEW",
        skill: "GRAMMAR",
        cefrTarget: "B1",
        requestedCount: 2,
      },
      items: [
        {
          id: "item-1",
          content: "A sample question",
          status: "FIRST_APPROVED",
          reviewer: { fullName: "Giảng viên A" },
          confirmer: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      statusCounts: [{ status: "FIRST_APPROVED", count: 1 }],
    },
  }),
}));

describe("BatchDetailView", () => {
  it("hiển thị dữ liệu lô và không kích hoạt thao tác chưa hoàn thành", () => {
    render(<BatchDetailView batchId="batch-1" />);
    expect(screen.getByRole("heading", { name: "Lô thử" })).toBeInTheDocument();
    expect(screen.getByText("A sample question")).toBeInTheDocument();
    expect(screen.getByText("Giảng viên A")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Giao việc" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kiểm tra cuối" })).not.toBeInTheDocument();
  });
});
