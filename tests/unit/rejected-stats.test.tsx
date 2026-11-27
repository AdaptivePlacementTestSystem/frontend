import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RejectedStats } from "@/features/admin-item-batches/rejected-stats";
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isLoading: false,
    error: null,
    data: {
      data: [{ key: "DUPLICATE_EXACT", label: "DUPLICATE_EXACT", count: 2 }],
      hasMore: false,
    },
  }),
}));
describe("AI rejected statistics", () => {
  it("shows the human-readable reason and distinct item count", () => {
    render(<RejectedStats />);
    expect(screen.getByText("T1 — Trùng chính xác")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
