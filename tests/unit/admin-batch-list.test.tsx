import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BatchListView } from "@/features/admin-item-batches/batch-list";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isLoading: false,
    error: null,
    data: {
      data: [
        {
          id: "batch-1",
          name: "Lô mẫu",
          source: "AI_GENERATED",
          status: "IN_REVIEW",
          _count: { items: 7 },
        },
      ],
      total: 1,
      limit: 20,
    },
  }),
}));

describe("BatchListView", () => {
  it("hiển thị lô và đường dẫn đến chi tiết", () => {
    render(<BatchListView />);
    expect(screen.getByText("Lô mẫu")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chi tiết" })).toHaveAttribute(
      "href",
      "/admin/item-batches/batch-1",
    );
  });
});
